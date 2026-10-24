// Microsoft neural voices through the official Azure AI Speech service.
// Needs two Netlify environment variables (the free F0 tier covers 500,000 characters a month):
//   AZURE_SPEECH_KEY     - key from your Azure "Speech" resource
//   AZURE_SPEECH_REGION  - its region, e.g. "eastus" or "centralindia"
// Returns MP3 audio, so the app can keep reading with the screen off.

const { guard, json } = require("../lib/guard");

const MAX_CHARS = 2500;

function escapeXml(s) {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

exports.handler = async function (event) {
  const g = guard(event, { methods: ["GET", "POST"] });
  if (g.response) return g.response;

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  // GET: lets the app know whether Microsoft voices are set up, without using any quota
  if (event.httpMethod === "GET") return json(200, { configured: !!(key && region) }, g.origin);
  if (!key || !region) return json(501, { error: "not-configured" }, g.origin);

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON." }, g.origin); }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice : "";
  if (!text) return json(400, { error: "Missing text." }, g.origin);
  if (text.length > MAX_CHARS) return json(400, { error: `Text too long (max ${MAX_CHARS}).` }, g.origin);
  if (!/^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice)) return json(400, { error: "Invalid voice." }, g.origin);
  if (!/^[a-z0-9]+$/.test(region)) return json(500, { error: "Invalid AZURE_SPEECH_REGION." }, g.origin);

  const lang = voice.split("-").slice(0, 2).join("-");
  const ssml = `<speak version='1.0' xml:lang='${lang}' xmlns='http://www.w3.org/2001/10/synthesis'>` +
    `<voice name='${voice}'>${escapeXml(text)}</voice></speak>`;

  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "Ultradian"
      },
      body: ssml
    });
    if (!res.ok) {
      const status = res.status === 429 ? 429 : 502;
      const msg = res.status === 429 ? "Monthly free voice limit reached or too many requests." : `Speech service error (${res.status}).`;
      return json(status, { error: msg }, g.origin);
    }
    const audio = Buffer.from(await res.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": g.origin,
        "Vary": "Origin",
        "Cache-Control": "private, max-age=86400"
      },
      body: audio.toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    return json(502, { error: "Could not reach the speech service." }, g.origin);
  }
};
