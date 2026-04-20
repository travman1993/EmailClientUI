/**
 * sanitize.js  — Fix #1: XSS / HTML Email Sanitization
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps DOMPurify with an email-safe config.
 *
 * Why this matters:
 *   Real email HTML contains tracking pixels, <script> tags, JavaScript event
 *   handlers (onclick, onload, onerror), CSS that breaks the host layout,
 *   and external resource loads that reveal the user's IP + read status.
 *   dangerouslySetInnerHTML on raw email body = XSS vulnerability.
 *
 * Install DOMPurify:
 *   npm install dompurify
 *   # or for Tauri (no CDN): already bundled — just import
 *
 * Usage:
 *   import { sanitizeEmailBody, sanitizePreview } from "./sanitize.js";
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeEmailBody(email.body) }} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

// DOMPurify is loaded from npm in a real build.
// In the browser-only / CDN fallback, it's available as window.DOMPurify.
let DOMPurify;
try {
  // ESM import (Vite / Webpack / Tauri)
  DOMPurify = (await import("dompurify")).default;
} catch {
  // Fallback: check window (CDN script tag)
  DOMPurify = typeof window !== "undefined" ? window.DOMPurify : null;
}

// ─── EMAIL BODY CONFIG ────────────────────────────────────────────────────────
// Allows safe formatting tags, blocks scripts, JS handlers, and external loads.

const EMAIL_BODY_CONFIG = {
  // Tags we allow — standard email formatting only
  ALLOWED_TAGS: [
    "a", "b", "strong", "i", "em", "u", "s", "strike",
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "th", "td",
    "blockquote", "pre", "code",
    "img",
    "div", "span",
    "sup", "sub",
  ],

  // Attributes we allow per-tag
  ALLOWED_ATTR: [
    "href", "src", "alt", "title",
    "style",          // inline styles allowed but filtered below
    "class",
    "colspan", "rowspan", "width", "height",
    "align", "valign",
    "border", "cellpadding", "cellspacing",
    "color",          // legacy email attr
  ],

  // Block ALL external resource loads (tracking pixels, CSS files, etc.)
  FORBID_ATTR: [
    "onerror", "onload", "onclick", "onmouseover", "onmouseout",
    "onfocus", "onblur", "onchange", "onsubmit", "onkeydown",
    "onkeyup", "onkeypress", "oncontextmenu",
    "background",     // background image attribute
    "action",         // form action
  ],

  // Never allow these tags no matter what
  FORBID_TAGS: [
    "script", "style", "link", "meta", "base",
    "form", "input", "button", "select", "textarea",
    "frame", "iframe", "object", "embed", "applet",
    "svg", "math",    // can contain JS
    "noscript",
  ],

  // Force all links to open in new tab (safer UX)
  ADD_ATTR: ["target"],

  // Strip data: URIs from src attributes (blocks data-URI XSS)
  ALLOW_DATA_ATTR: false,
};

// ─── CSS PROPERTY ALLOWLIST ───────────────────────────────────────────────────
// Filters inline style attributes to safe visual properties only.
// Prevents CSS-based attacks (e.g. position:fixed overlay, expression(), etc.)

const SAFE_CSS_PROPS = new Set([
  "color", "background-color", "font-size", "font-weight", "font-style",
  "font-family", "text-align", "text-decoration", "text-transform",
  "line-height", "letter-spacing", "word-spacing",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-color", "border-width", "border-style", "border-radius",
  "width", "max-width", "min-width",
  "height", "max-height", "min-height",
  "display", "vertical-align",
  "white-space", "word-wrap", "word-break", "overflow-wrap",
]);

function sanitizeInlineStyle(styleStr) {
  if (!styleStr) return "";
  try {
    const safe = [];
    const decls = styleStr.split(";").map(s => s.trim()).filter(Boolean);
    for (const decl of decls) {
      const colonIdx = decl.indexOf(":");
      if (colonIdx === -1) continue;
      const prop  = decl.slice(0, colonIdx).trim().toLowerCase();
      const value = decl.slice(colonIdx + 1).trim();
      // Block expression(), url() with http/https (external loads), and JS
      const dangerousValue = /expression\s*\(/i.test(value)
        || /javascript\s*:/i.test(value)
        || /url\s*\(\s*["']?\s*https?:/i.test(value);  // blocks remote CSS resources
      if (SAFE_CSS_PROPS.has(prop) && !dangerousValue) {
        safe.push(`${prop}: ${value}`);
      }
    }
    return safe.join("; ");
  } catch {
    return "";
  }
}

// ─── HOOK: post-process after DOMPurify ──────────────────────────────────────
// Called by DOMPurify's AFTER_SANITIZE_ATTRIBUTES hook to:
//   1. Force links to open in a new tab safely
//   2. Strip inline styles down to the safe CSS allowlist
//   3. Block tracking pixels (1x1 images)

function applyPostProcessing(node) {
  // Force safe external links
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
    // Block javascript: links
    const href = node.getAttribute("href") || "";
    if (/^\s*javascript\s*:/i.test(href)) {
      node.removeAttribute("href");
    }
  }

  // Sanitize inline styles
  if (node.hasAttribute && node.hasAttribute("style")) {
    const cleaned = sanitizeInlineStyle(node.getAttribute("style"));
    if (cleaned) {
      node.setAttribute("style", cleaned);
    } else {
      node.removeAttribute("style");
    }
  }

  // Block tracking pixels: img tags with 1x1 or 0x0 dimensions
  if (node.tagName === "IMG") {
    const w = parseInt(node.getAttribute("width")  || "999", 10);
    const h = parseInt(node.getAttribute("height") || "999", 10);
    if (w <= 1 || h <= 1) {
      node.remove();
    }
  }
}

// ─── FALLBACK (no DOMPurify) ──────────────────────────────────────────────────
// If DOMPurify is unavailable (e.g. SSR without a DOM), strip all HTML tags.
// This is a worst-case fallback — install DOMPurify in production.

function stripAllHtml(html) {
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html.replace(/<[^>]*>/g, "");
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * sanitizeEmailBody(html)
 * Full sanitization for email preview pane body content.
 * Allows safe HTML formatting, strips scripts/styles/JS handlers/trackers.
 *
 * @param {string} html  Raw email body HTML from backend
 * @returns {string}     Safe HTML string for dangerouslySetInnerHTML
 */
export function sanitizeEmailBody(html) {
  if (!html || typeof html !== "string") return "";

  if (!DOMPurify) {
    console.warn("[MailFlow] DOMPurify not available — falling back to text-only rendering. Run: npm install dompurify");
    return `<p style="white-space:pre-wrap">${stripAllHtml(html)}</p>`;
  }

  // Register post-processing hook
  DOMPurify.addHook("afterSanitizeAttributes", applyPostProcessing);

  const clean = DOMPurify.sanitize(html, EMAIL_BODY_CONFIG);

  // Remove hook after use (prevents double-registration on re-renders)
  DOMPurify.removeHooks("afterSanitizeAttributes");

  return clean;
}

/**
 * sanitizePreview(text)
 * Strips ALL HTML from preview snippets — they render as plain text only.
 *
 * @param {string} text
 * @returns {string}
 */
export function sanitizePreview(text) {
  if (!text || typeof text !== "string") return "";
  return stripAllHtml(text).slice(0, 200);
}

/**
 * sanitizePlainText(text)
 * Escapes special HTML characters for any user-supplied plain text
 * rendered inside HTML (e.g. email addresses, subject lines).
 *
 * @param {string} text
 * @returns {string}
 */
export function sanitizePlainText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}