/* ==================== SAFE HTML HELPERS ====================
 * Use these whenever user-typed or external text goes into innerHTML.
 *
 *   escapeHTML(text)        → plain text, shown literally (names, titles, notes, AI quiz answers)
 *   sanitizeRichHTML(html)  → keeps formatting (bold, lists, colors) but strips
 *                             scripts, event handlers and javascript: links (journal content)
 *   safeImageSrc(src)       → only data:image/…, blob:, http(s) and relative URLs
 * ============================================================ */

function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const RICH_ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "MARK", "SMALL", "SUB", "SUP",
  "P", "DIV", "SPAN", "BR", "HR", "FONT",
  "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "CODE",
  "UL", "OL", "LI", "DL", "DT", "DD", "A", "IMG",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH",
  "SECTION", "ARTICLE", "FIGURE", "FIGCAPTION"
]);
const RICH_DROP_WITH_CONTENT = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "SVG", "MATH", "LINK", "META"]);
const RICH_ALLOWED_ATTRS = new Set(["style", "color", "face", "size", "class", "href", "src", "alt", "align"]);

function safeImageSrc(src) {
  const s = String(src || "").trim();
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(s)) return s;
  if (/^(blob:|https?:\/\/)/i.test(s)) return s;
  if (/^[\w./-]+$/.test(s)) return s; // relative file in the app
  return "";
}

function sanitizeRichHTML(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html || "");

  const walk = (node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) { child.remove(); continue; }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      if (RICH_DROP_WITH_CONTENT.has(child.tagName)) { child.remove(); continue; }
      if (!RICH_ALLOWED_TAGS.has(child.tagName)) {
        // Unknown tag: keep its text/children, drop the wrapper
        walk(child);
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (!RICH_ALLOWED_ATTRS.has(name)) { child.removeAttribute(attr.name); continue; }
        if (name === "style" && /url\s*\(|expression\s*\(|javascript:/i.test(value)) child.removeAttribute(attr.name);
        if (name === "href" && !/^(https?:|mailto:|#)/i.test(value.trim())) child.removeAttribute(attr.name);
        if (name === "src") {
          const safe = child.tagName === "IMG" ? safeImageSrc(value) : "";
          if (safe) child.setAttribute("src", safe); else child.removeAttribute(attr.name);
        }
      }
      if (child.tagName === "A") { child.setAttribute("rel", "noopener noreferrer"); child.setAttribute("target", "_blank"); }

      walk(child);
    }
  };

  walk(tpl.content);
  return tpl.innerHTML;
}
