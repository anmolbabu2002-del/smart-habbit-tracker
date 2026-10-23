// Netlify serverless function to proxy Gutenberg book text downloads.
// This avoids all CORS issues by fetching server-side.

const { guard } = require("../lib/guard");

// Netlify caps function responses at 6 MB
const MAX_BOOK_BYTES = 5.5 * 1024 * 1024;

function isGutenbergUrl(u) {
  return u.protocol === "https:" &&
    (u.hostname === "gutenberg.org" || u.hostname.endsWith(".gutenberg.org"));
}

exports.handler = async function (event) {
  const g = guard(event, { methods: ["GET"] });
  if (g.response) return g.response;

  const bookUrl = event.queryStringParameters?.url;

  if (!bookUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'url' query parameter." }),
    };
  }

  // Only allow Project Gutenberg hosts (parsed, so "evil.com/?gutenberg.org" is rejected)
  let parsed;
  try {
    parsed = new URL(bookUrl.replace(/^http:\/\//, "https://"));
  } catch {
    parsed = null;
  }
  if (!parsed || !isGutenbergUrl(parsed)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Only Project Gutenberg URLs are allowed." }),
    };
  }

  try {
    // Follow redirects manually so a redirect can't lead off Gutenberg
    let target = parsed;
    let response;
    for (let hop = 0; hop < 5; hop++) {
      response = await fetch(target.href, {
        redirect: "manual",
        headers: { "User-Agent": "UltradianApp/1.0 (Book Reader)" },
      });
      if (response.status < 300 || response.status >= 400) break;
      const next = new URL(response.headers.get("location") || "", target);
      if (!isGutenbergUrl(next)) {
        return { statusCode: 403, body: JSON.stringify({ error: "Redirected away from Project Gutenberg." }) };
      }
      target = next;
    }

    const length = parseInt(response.headers.get("content-length") || "0", 10);
    if (length > MAX_BOOK_BYTES) {
      return { statusCode: 413, body: JSON.stringify({ error: "Book is too large for the proxy." }) };
    }

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
        "Access-Control-Allow-Origin": g.origin,
        "Vary": "Origin",
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
