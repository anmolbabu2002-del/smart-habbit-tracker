// Netlify serverless function to proxy Google Translate TTS audio.
// Returns raw audio/mpeg bytes with proper CORS headers.
// This completely bypasses browser CORS restrictions.

exports.handler = async function (event) {
  const text = event.queryStringParameters?.q;
  const lang = event.queryStringParameters?.tl || 'hi';

  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'q' (text) query parameter." }),
    };
  }

  // Limit text length to prevent abuse
  if (text.length > 200) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Text too long. Max 200 characters." }),
    };
  }

  const googleUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(googleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Google TTS returned: ${response.statusText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
