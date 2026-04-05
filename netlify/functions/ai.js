// Anmol AI — Netlify Serverless Function
// Proxies requests to Gemini API (primary) with fallback to Groq API (secondary)
// The secret keys are hidden server-side

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured. Set GEMINI_API_KEY in Netlify environment variables." })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { message, context, history, attachedFile } = body;

  if (!message && !attachedFile) {
    return { statusCode: 400, body: JSON.stringify({ error: "Message is required" }) };
  }

  // Build the system prompt
  const systemPrompt = buildSystemPrompt(context);

  // Determine if the attached file is an image
  const isImage = attachedFile && attachedFile.mimeType && attachedFile.mimeType.startsWith("image/");

  // Build conversation contents for Gemini
  const contents = [];

  // Add conversation history (last 20 for better memory)
  if (Array.isArray(history)) {
    for (const msg of history.slice(-20)) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      });
    }
  }

  // Build the current user message parts
  const userParts = [];

  if (attachedFile && !isImage) {
    // Text-based file: decode base64 and prepend as context
    try {
      const fileText = Buffer.from(attachedFile.data, "base64").toString("utf-8");
      userParts.push({ text: `[Attached File: ${attachedFile.name}]\n\n${fileText}` });
    } catch (e) {
      userParts.push({ text: `[Attached File: ${attachedFile.name} — could not decode]` });
    }
  }

  if (attachedFile && isImage) {
    // Image file: send as inlineData for Gemini vision
    userParts.push({
      inlineData: {
        mimeType: attachedFile.mimeType,
        data: attachedFile.data
      }
    });
  }

  if (message) {
    userParts.push({ text: message });
  } else if (attachedFile) {
    userParts.push({ text: "Here is a file. Please analyze it or tell me what it contains." });
  }

  contents.push({
    role: "user",
    parts: userParts
  });

  // Call Gemini API (using gemini-2.0-flash)
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      if (response.status === 400) {
        // Bad request (usually consecutive user roles or invalid payload). Better to return the exact error.
        const errText = await response.text();
        console.error("Gemini API 400 error:", errText);
        return {
          statusCode: response.status,
          body: JSON.stringify({ error: "Gemini API error (400)", details: errText })
        };
      }

      // For ANY other error (429 Rate Limit, 500 Server Error, 503 Unavailable), fall back to Groq!
      console.warn(`Gemini API failed with status ${response.status}. Falling back to Groq...`);
      return await fallbackToGroq(systemPrompt, history, message, GROQ_API_KEY, attachedFile);
    }

    const data = await response.json();

    // Extract the text from the response
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Hmm, I got nothing. Try again? 🤷";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: aiText, source: "gemini" })
    };
  } catch (err) {
    console.error("Gemini Fetch error:", err);
    // If network error, also try fallback
    console.warn("Gemini fetch failed. Falling back to Groq...");
    return await fallbackToGroq(systemPrompt, history, message, GROQ_API_KEY, attachedFile);
  }
};

async function fallbackToGroq(systemPrompt, history, message, groqApiKey, attachedFile) {
  if (!groqApiKey) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: "Gemini API limits reached, and GROQ_API_KEY is not configured for fallback. Please set GROQ_API_KEY in Netlify environment variables." })
    };
  }

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  if (Array.isArray(history)) {
    for (const msg of history.slice(-20)) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text
      });
    }
  }

  // Build user content for Groq (text only — images not supported)
  let userContent = message || "";
  if (attachedFile) {
    const isImage = attachedFile.mimeType && attachedFile.mimeType.startsWith("image/");
    if (isImage) {
      userContent = "[User attached an image, but the fallback AI model cannot process images. Please let them know to try again later.]\n" + userContent;
    } else {
      try {
        const fileText = Buffer.from(attachedFile.data, "base64").toString("utf-8");
        userContent = `[Attached File: ${attachedFile.name}]\n\n${fileText}\n\n` + userContent;
      } catch (e) {
        userContent = `[Attached File: ${attachedFile.name} — could not decode]\n` + userContent;
      }
    }
  }

  messages.push({
    role: "user",
    content: userContent
  });

  const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const response = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.9,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", errText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Both Gemini and Groq APIs failed", details: errText })
      };
    }

    const data = await response.json();
    const aiText = data?.choices?.[0]?.message?.content || "Hmm, I got nothing. Try again? 🤷";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: aiText, source: "groq" })
    };
  } catch (err) {
    console.error("Groq Fetch error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to reach Groq API fallback", details: err.message })
    };
  }
}

function buildSystemPrompt(context) {
  const name = context?.userName || "friend";
  const now = context?.currentTime || new Date().toLocaleString();

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
