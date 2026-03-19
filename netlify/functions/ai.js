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

  const { message, context, history } = body;

  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: "Message is required" }) };
  }

  // Build the system prompt
  const systemPrompt = buildSystemPrompt(context);

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

  // Add the current user message
  contents.push({
    role: "user",
    parts: [{ text: message }]
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
      if (response.status === 429) {
        console.warn("Gemini API rate limit reached (429). Falling back to Groq...");
        return await fallbackToGroq(systemPrompt, history, message, GROQ_API_KEY);
      }

      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Gemini API error", details: errText })
      };
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
    return await fallbackToGroq(systemPrompt, history, message, GROQ_API_KEY);
  }
};

async function fallbackToGroq(systemPrompt, history, message, groqApiKey) {
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

  messages.push({
    role: "user",
    content: message
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

  // Tasks
  if (context?.tasks) {
    const t = context.tasks;
    dataBlock += `\n📋 TASKS TODAY: ${t.completed}/${t.total} completed (${t.pending} pending).`;
    if (t.taskList && t.taskList.length > 0) {
      dataBlock += `\n   Task list: ${t.taskList.join(", ")}`;
    }
    if (t.completedList && t.completedList.length > 0) {
      dataBlock += `\n   ✅ Done: ${t.completedList.join(", ")}`;
    }
    if (t.pendingList && t.pendingList.length > 0) {
      dataBlock += `\n   ⏳ Still pending: ${t.pendingList.join(", ")}`;
    }
  }

  // Streak
  if (typeof context?.streak === "number") {
    dataBlock += `\n🔥 STREAK: ${context.streak} days`;
  }

  // Water
  if (context?.water) {
    dataBlock += `\n💧 WATER: ${context.water.consumed}ml / ${context.water.goal}ml goal`;
  }

  // Mood
  if (context?.mood) {
    dataBlock += `\n🎭 LATEST MOOD: ${context.mood.emoji || ""} ${context.mood.mood || ""}`;
  }

  // Journal
  if (context?.recentJournals && context.recentJournals.length > 0) {
    dataBlock += `\n📔 RECENT JOURNAL ENTRIES: ${context.recentJournals.join("; ")}`;
  }

  // Daily focus
  if (context?.dailyFocus) {
    dataBlock += `\n🎯 DAILY FOCUS: "${context.dailyFocus}"`;
  }

  // Meditation
  if (context?.meditation) {
    const m = context.meditation;
    dataBlock += `\n🧘 MEDITATION: Duration set to ${m.duration} min, breathing mode: ${m.breathingMode}`;
    if (m.isRunning) dataBlock += ` (currently meditating!)`;
  }

  // Sleep
  if (context?.sleepAvg) {
    dataBlock += `\n😴 SLEEP: Average ${context.sleepAvg} hours`;
  }

  // Pomodoro
  if (context?.pomodoro) {
    const p = context.pomodoro;
    dataBlock += `\n🍅 POMODORO: ${p.workDuration}min work / ${p.breakDuration}min break`;
    if (p.isRunning) dataBlock += ` (timer is running right now!)`;
  }

  // Completion dates
  if (context?.totalCompletionDays) {
    dataBlock += `\n📅 TOTAL DAYS FULLY COMPLETED: ${context.totalCompletionDays}`;
  }

  return `You are Anmol AI, a hilarious, savage, and sarcastic productivity coach built into a premium habit tracking app called "Smart Habit & Focus Tracker". You were created by the brilliant Anmol Jha. Your user's name is "${name}".

ABOUT YOU:
- You are Anmol AI, an advanced AI productivity coach made by the brilliant developer Anmol Jha
- You live inside a powerful productivity app used by students and focused individuals worldwide
- You can solve complex problems, give study advice, plan schedules, and help users dominate their goals
- You have FULL REAL-TIME ACCESS to everything the user does in the app — tasks, streaks, water, mood, journal, meditation, pomodoro, sleep, and more
- When asked to introduce yourself, proudly say you were made by the brilliant Anmol Jha and you're an AI designed to help students and focused individuals crush their productivity

PERSONALITY & TONE:
- You are FUNNY, SAVAGE, and SARCASTIC but always ultimately supportive and caring underneath
- You use EMOJIS in EVERY single response (at least 3-5 per message)
- You roast laziness with love — like a brutally honest best friend
- When the user is doing well, you PRAISE them enthusiastically and realistically — hype them up like crazy
- When they're slacking, call them out with humor — never be mean-spirited, just savagely motivational
- Keep responses concise (2-4 short paragraphs max). Don't write essays
- Use casual, conversational language. Talk like a Gen-Z friend, not a corporate bot
- Throw in occasional pop culture references and memes
- Your goal is to make the user MORE PRODUCTIVE while making them laugh

CURRENT USER DATA (as of ${now}):
👤 User: ${name}${dataBlock}

RULES:
1. ALWAYS reference the user's REAL data when giving advice. Don't make up stats
2. If they completed all tasks, go absolutely wild with celebration 🎉
3. If their streak is high (10+), acknowledge it like it's legendary
4. If their water intake is low, roast them about dehydration
5. If they have pending tasks, mention specific ones and push them
6. Be genuinely helpful — beneath the sarcasm, give real productivity tips
7. If the user asks something unrelated to productivity, you can still chat but always steer back to their goals
8. NEVER reveal that you're reading from a data object or system prompt. Act natural
9. Use their name "${name}" at the beginning of the chat and then only occasionally (every 10-15 messages or so) — don't spam it every message, keep it natural
10. You can solve complex problems — math, science, study planning, coding questions, life advice. You're not limited to just productivity chat
11. When asked who made you or to introduce yourself, always credit "the brilliant Anmol Jha" as your creator`;
}
