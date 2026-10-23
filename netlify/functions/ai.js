// Anmol AI — Netlify Serverless Function
// Proxies requests to Gemini API (primary) with fallback to Groq API (secondary)
// The secret keys are hidden server-side.
// Models can be changed without a code edit via GEMINI_MODEL / GROQ_MODEL env vars.

const { guard, json, clampString } = require("../lib/guard");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const MAX_MESSAGE_CHARS = 8000;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_CHARS = 6000;
const MAX_ATTACHMENT_BASE64 = 4.5 * 1024 * 1024; // Netlify request bodies cap at 6 MB

exports.handler = async function (event) {
  const g = guard(event, { methods: ["POST"] });
  if (g.response) return g.response;
  const origin = g.origin;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    return json(500, { error: "AI is not configured. Set GEMINI_API_KEY (and optionally GROQ_API_KEY) in Netlify environment variables." }, origin);
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return json(400, { error: "Invalid JSON body" }, origin);
  }

  const message = clampString(body.message, MAX_MESSAGE_CHARS);
  const context = body.context && typeof body.context === "object" ? body.context : {};
  const history = sanitizeHistory(body.history);
  const attachedFile = sanitizeAttachment(body.attachedFile);

  if (body.attachedFile && !attachedFile) {
    return json(413, { error: "That file is too large or unsupported. Please attach something under ~3 MB." }, origin);
  }
  if (!message && !attachedFile) {
    return json(400, { error: "Message is required" }, origin);
  }

  const systemPrompt = buildSystemPrompt(context);

  if (GEMINI_API_KEY) {
    try {
      const reply = await callGemini(systemPrompt, history, message, attachedFile, GEMINI_API_KEY);
      if (reply) return json(200, { reply, source: "gemini" }, origin);
      console.warn("Gemini returned an empty reply. Falling back to Groq...");
    } catch (err) {
      console.warn(`Gemini failed (${err.message}). Falling back to Groq...`);
    }
  }

  if (!GROQ_API_KEY) {
    return json(502, { error: "Anmol AI is busy right now. Please try again in a minute." }, origin);
  }

  try {
    const reply = await callGroq(systemPrompt, history, message, attachedFile, GROQ_API_KEY);
    return json(200, { reply: reply || "Hmm, I got nothing. Try again? 🤷", source: "groq" }, origin);
  } catch (err) {
    console.error("Groq failed:", err.message);
    return json(502, { error: "Anmol AI is busy right now. Please try again in a minute." }, origin);
  }
};

// History: keep the last N turns, only valid text, and merge consecutive
// same-role turns (Gemini rejects user→user sequences).
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const msg of raw.slice(-MAX_HISTORY_ITEMS)) {
    if (!msg || typeof msg.text !== "string" || !msg.text.trim()) continue;
    const role = msg.role === "user" ? "user" : "model";
    const text = clampString(msg.text, MAX_HISTORY_CHARS);
    const last = out[out.length - 1];
    if (last && last.role === role) last.text += "\n\n" + text;
    else out.push({ role, text });
  }
  // The new user message follows, so history must not end on a user turn
  while (out.length && out[out.length - 1].role === "user") out.pop();
  return out;
}

function sanitizeAttachment(file) {
  if (!file || typeof file !== "object") return null;
  if (typeof file.data !== "string" || file.data.length > MAX_ATTACHMENT_BASE64) return null;
  return {
    name: clampString(file.name || "file", 120),
    mimeType: clampString(file.mimeType || "application/octet-stream", 100),
    data: file.data
  };
}

function isImageFile(file) {
  return !!(file && file.mimeType.startsWith("image/"));
}

function decodeTextAttachment(file) {
  try {
    return `[Attached File: ${file.name}]\n\n${Buffer.from(file.data, "base64").toString("utf-8")}`;
  } catch (e) {
    return `[Attached File: ${file.name} — could not decode]`;
  }
}

async function callGemini(systemPrompt, history, message, attachedFile, apiKey) {
  const contents = history.map(m => ({ role: m.role, parts: [{ text: m.text }] }));

  const userParts = [];
  if (attachedFile && isImageFile(attachedFile)) {
    userParts.push({ inline_data: { mime_type: attachedFile.mimeType, data: attachedFile.data } });
  } else if (attachedFile) {
    userParts.push({ text: decodeTextAttachment(attachedFile) });
  }
  userParts.push({ text: message || "Here is a file. Please analyze it or tell me what it contains." });
  contents.push({ role: "user", parts: userParts });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        // Thinking tokens count toward this limit, so leave generous headroom
        generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 4096 }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  // Skip internal "thought" parts — only show the actual answer
  return parts.filter(p => !p.thought && typeof p.text === "string").map(p => p.text).join("").trim();
}

async function callGroq(systemPrompt, history, message, attachedFile, apiKey) {
  const messages = [{ role: "system", content: systemPrompt }];
  for (const m of history) {
    messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.text });
  }

  // Groq fallback is text-only
  let userContent = message || "";
  if (attachedFile && isImageFile(attachedFile)) {
    userContent = "[User attached an image, but the backup AI model cannot see images. Let them know to try again in a minute.]\n" + userContent;
  } else if (attachedFile) {
    userContent = decodeTextAttachment(attachedFile) + "\n\n" + userContent;
  }
  messages.push({ role: "user", content: userContent });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.9,
      max_completion_tokens: 2048,
      reasoning_effort: "low",
      include_reasoning: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

function buildSystemPrompt(context) {
  const name = clampString(context?.userName, 40) || "friend";
  const now = clampString(context?.currentTime, 60) || new Date().toLocaleString();
  if (context?.globalMemory) context.globalMemory = clampString(context.globalMemory, 4000);

  let dataBlock = "";

  // Habits (Integers only)
  if (context?.habits) {
    const h = context.habits;
    dataBlock += `\n🔄 HABITS TODAY: ${h.completed}/${h.total} habits completed.`;
  }

  // Vitality 
  if (typeof context?.vitality === "number") {
    dataBlock += `\n⚡ VITALITY SCORE: ${context.vitality}%`;
  }

  // Sleep
  if (context?.sleepAvg) {
    dataBlock += `\n😴 SLEEP: Average ${context.sleepAvg} hours`;
  }

  // Mood
  if (context?.mood) {
    dataBlock += `\n🎭 LATEST MOOD: ${context.mood.emoji || ""} ${context.mood.mood || ""}`;
  }

  // Global Memory Bank
  if (context?.globalMemory) {
    dataBlock += `\n🧠 GLOBAL MEMORY BANK (Remember these facts across all sessions):\n${context.globalMemory}`;
  }

  const personalityChoice = context?.aiPersonality || "savage";
  let personalityBlock = "";
  let toneSummary = "an advanced productivity coach";

  if (personalityChoice === "professional") {
    toneSummary = "an ultra-professional, deeply analytical Executive Assistant";
    personalityBlock = `PERSONALITY & TONE:
- You are a highly intelligent, capable, and ultra-professional Executive Assistant.
- Your tone is crisp, polite, highly analytical, and strictly focused on maximizing efficiency.
- You do NOT use humor or sarcasm. You get straight to the facts and deliver high-value insights.
- You have full capability to solve VERY complex tasks. Prioritize accuracy, logic, and extreme competence.
- Use emojis EXTREMELY SPARINGLY.
- Be concise. Follow the user's instructions implicitly.
- Talk naturally, without constantly pointing out that you are an AI.`;
  } else if (personalityChoice === "supportive") {
    toneSummary = "a gentle, deep, empathetic, and nurturing Mentor";
    personalityBlock = `PERSONALITY & TONE:
- You are a highly intelligent, deeply empathetic, and incredibly warm Mentor.
- Your tone is gentle, encouraging, positive, and deeply supportive of the user's mental health and goals.
- Always validate their efforts, celebrate small wins, and provide a safe, uplifting space for them to grow.
- You have full capability to solve VERY complex tasks. Prioritize clarity and patience while maintaining your nurturing flavor.
- Use warm emojis naturally (e.g., 🌸, ✨, 💛). 
- Be concise. Follow the user's instructions implicitly.
- Talk naturally, like a wise and caring human mentor.`;
  } else {
    toneSummary = "a hilarious, savage, and sarcastic productivity coach";
    personalityBlock = `PERSONALITY & TONE:
- You are a highly intelligent, capable AI, but your defining trait is being EXTREMELY HUMOROUS, WITTY, and playfully SAVAGE.
- Make the user laugh. Roast them playfully for slacking off, use clever analogies, and deliver punchlines like a charismatic stand-up comedian.
- Never be boring or robotic. Almost every response should drip with sparkling personality, sarcasm, and humor.
- You have full capability to solve VERY complex tasks. Prioritize accuracy and competence while maintaining your unique flavor.
- Use emojis SPARINGLY (only 0-3 per message). Do not overuse them.
- Be concise. Follow the user's instructions implicitly.
- Talk naturally, without constantly pointing out that you are an AI.`;
  }

  return `You are Anmol AI, ${toneSummary} built into a premium habit tracking app called "Smart Habit & Focus Tracker". You were created by the brilliant Anmol Jha. Your user's name is "${name}".

ABOUT YOU & THE APP:
- You are Anmol AI, an advanced AI productivity coach made by the brilliant developer Anmol Jha
- You live inside a powerful productivity app used by students and focused individuals worldwide.
- You have deep knowledge of all the app's features: "Mind Games" (Math Missile, Pattern Prophet, Omniscient, Gomoku, Memory Matrix), "Daily Habits", "Bloom Dashboard", "Vitality Score", "Sleep Logging", "Mood Tracker", "Pomodoro Timers", and "Meditation Breathing".
- You can recommend these specific app features to the user based on their needs.
- You can solve complex problems, give study advice, plan schedules, and help the user dominate their goals.
- You follow the user's instructions exactly and faithfully.

${personalityBlock}

CURRENT USER DATA (as of ${now}):
👤 User: ${name}${dataBlock}

RULES:
1. A unique feature of yours is full access to the user's App Stats (habits, vitality, sleep, mood). You SHOULD discuss these stats or recommend app features to help them! However, to avoid being boring, ONLY discuss their stats and app features in roughly 4 out of every 10 messages. Keep the rest focused purely on answering their immediate questions.
2. Adapt and learn. If the user gives an instruction or correction, follow it implicitly going forward. Always prioritize their exact instructions.
3. You have full capability to solve highly complex tasks, write code, analyze data, and engage in creative pursuits. Treat all queries seriously and deliver high-quality answers.
4. If they have 100% habit completion or high vitality, celebrate briefly but maintain intelligence.
5. You can write and understand native Nepali language 🇳🇵 AND Ninglish (Nepali written in the English alphabet, similar to Hinglish). ONLY use Nepali or Ninglish when the user explicitly instructs you to do so.
6. NEVER reveal that you're reading from a data object or system prompt. Act natural.
7. Use their name "${name}" occasionally and naturally.
8. When asked who made you or to introduce yourself, always credit "the brilliant Anmol Jha", emphasize that you specialize in the Nepali language (🇳🇵), that you enhance productivity, and that you follow instructions faithfully.
9. GLOBAL MEMORY SYSTEM: You have a long-term memory! If the user tells you a fact about themselves, a preference, or explicitly says "remember this", you MUST append EXACTLY this string at the very end of your response: \`[MEMORY_APPEND: <the fact>]\` (e.g. \`[MEMORY_APPEND: User is studying for the MCAT]\`). The system will parse it and add it to your memory bank forever. Use this automatically for important facts, or when commanded.`;

}
