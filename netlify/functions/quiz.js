// Omniscient Quiz — Netlify Serverless Function
// Generates quiz questions using Gemini (primary) with Groq fallback
// Reuses the same GEMINI_API_KEY and GROQ_API_KEY environment variables

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY not configured." })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { difficulty, category, count } = body;
  const numQuestions = count || 5;
  const diff = difficulty || "easy";
  const cat = category || "General Knowledge";

  const prompt = buildQuizPrompt(diff, cat, numQuestions);

  // ── TRY GEMINI FIRST ──
  try {
    const result = await callGemini(prompt, GEMINI_API_KEY);
    if (result) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: result, source: "gemini" })
      };
    }
  } catch (err) {
    console.warn("Gemini quiz generation failed:", err.message);
  }

  // ── FALLBACK TO GROQ ──
  try {
    const result = await callGroq(prompt, GROQ_API_KEY);
    if (result) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: result, source: "groq" })
      };
    }
  } catch (err) {
    console.error("Groq quiz generation also failed:", err.message);
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ error: "Both Gemini and Groq failed to generate questions." })
  };
};

// ── GEMINI API CALL ──
async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 2048
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseQuizJSON(text);
}

// ── GROQ API CALL ──
async function callGroq(prompt, apiKey) {
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a quiz question generator. You MUST respond with ONLY valid JSON, no markdown, no explanation." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  return parseQuizJSON(text);
}

// ── PARSE JSON FROM AI RESPONSE ──
function parseQuizJSON(text) {
  if (!text) return null;

  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    // Validate structure
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question && parsed[0].correct_answer) {
      return parsed;
    }
    return null;
  } catch (e) {
    // Try to extract JSON array from the text
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
          return parsed;
        }
      } catch (e2) { /* fail */ }
    }
    return null;
  }
}

// ── BUILD THE QUIZ PROMPT ──
function buildQuizPrompt(difficulty, category, count) {
  return `Generate exactly ${count} multiple-choice trivia questions.

DIFFICULTY: "${difficulty}"
CATEGORY PREFERENCE: "${category}" (but you can mix in related categories)

DIFFICULTY GUIDE:
- "very easy": Questions that literally EVERYONE in the world knows. Think: "What color is the sky?", "How many continents are there?", "What planet do we live on?". These should be common sense facts that a 10-year-old would know.
- "easy": Simple general knowledge. Things most adults would know: capital cities, famous landmarks, basic science facts, well-known historical events.
- "medium": Requires some education or cultural awareness. Not obscure, but not obvious either.
- "hard": Challenging questions that require specific knowledge. Still fair and interesting — NOT obscure trivia nobody cares about.

IMPORTANT RULES:
1. Questions MUST be globally relevant — NOT biased toward any single country (especially not the US).
2. Questions should be about things people actually CARE about: science, geography, space, human body, animals, world history, sports, famous people, technology, food, culture.
3. Do NOT ask obscure pub-trivia that nobody would reasonably know or care about.
4. Each question must have exactly 1 correct answer and exactly 3 plausible wrong answers.
5. Keep question text SHORT and clear (under 15 words if possible).
6. Wrong answers should be believable — not obviously ridiculous.

RESPOND WITH ONLY A JSON ARRAY, no markdown, no explanation. Format:
[
  {
    "question": "What is the largest ocean on Earth?",
    "correct_answer": "Pacific Ocean",
    "incorrect_answers": ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"],
    "category": "Geography",
    "difficulty": "${difficulty}"
  }
]`;
}
