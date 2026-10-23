// Shared request guards for Ultradian's Netlify functions.
// Netlify bundles this file into each function that requires it.

// Origins allowed to call our functions from a browser. Netlify sets URL
// (production) and DEPLOY_PRIME_URL / DEPLOY_URL (branch + preview deploys).
// Extra domains can be added with ALLOWED_ORIGINS="https://a.com,https://b.com".
function allowedOrigins() {
  const list = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL];
  if (process.env.ALLOWED_ORIGINS) list.push(...process.env.ALLOWED_ORIGINS.split(","));
  return list.filter(Boolean).map(o => o.trim().replace(/\/$/, ""));
}

function isLocalDev(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}

// Returns the request's origin if it's one of ours, otherwise null.
// Same-origin GETs may omit Origin, so fall back to Referer.
function getTrustedOrigin(event) {
  const h = event.headers || {};
  let origin = h.origin || h.Origin || "";
  if (!origin) {
    const ref = h.referer || h.Referer || "";
    try { origin = ref ? new URL(ref).origin : ""; } catch { origin = ""; }
  }
  if (!origin) return null;
  if (isLocalDev(origin)) return origin;
  // No env configured (e.g. `netlify dev` without a linked site): allow
  const allowed = allowedOrigins();
  if (allowed.length === 0) return origin;
  return allowed.includes(origin) ? origin : null;
}

function json(statusCode, data, origin) {
  const headers = { "Content-Type": "application/json" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return { statusCode, headers, body: JSON.stringify(data) };
}

// Use at the top of a handler. Returns { origin } on success or { response } to return immediately.
function guard(event, { methods = ["POST"] } = {}) {
  const origin = getTrustedOrigin(event);
  if (event.httpMethod === "OPTIONS") {
    if (!origin) return { response: { statusCode: 403, body: "" } };
    return {
      response: {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": methods.join(", "),
          "Access-Control-Allow-Headers": "Content-Type",
          "Vary": "Origin"
        },
        body: ""
      }
    };
  }
  if (!methods.includes(event.httpMethod)) {
    return { response: json(405, { error: "Method not allowed" }, origin) };
  }
  if (!origin) {
    return { response: json(403, { error: "Requests are only accepted from the Ultradian app." }) };
  }
  return { origin };
}

function clampString(value, max) {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

module.exports = { guard, json, clampString };
