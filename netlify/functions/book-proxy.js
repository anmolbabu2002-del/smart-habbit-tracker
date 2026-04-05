// Netlify serverless function to proxy Gutenberg book text downloads.
// This avoids all CORS issues by fetching server-side.

exports.handler = async function (event) {
  const bookUrl = event.queryStringParameters?.url;

  if (!bookUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'url' query parameter." }),
    };
  }

  // Only allow Gutenberg URLs for security
  if (!bookUrl.includes("gutenberg.org")) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Only Project Gutenberg URLs are allowed." }),
    };
  }

  try {
    const response = await fetch(bookUrl, {
      headers: {
        "User-Agent": "UltradianApp/1.0 (Book Reader; contact@example.com)",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Failed to fetch from Gutenberg: ${response.statusText}`,
      };
    }

    const text = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400", // Cache for 24h
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
