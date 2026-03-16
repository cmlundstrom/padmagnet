/**
 * Shared input validation and sanitization utilities.
 * Use these on ALL user-supplied input in API routes.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate that a string is a properly-formatted UUID. */
export function isValidUUID(str) {
  return typeof str === 'string' && UUID_RE.test(str);
}

/** Validate a price value (positive number, max $999,999). */
export function isValidPrice(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n > 0 && n <= 999999;
}

/** Validate an integer within a range. Returns the parsed int or null. */
export function parseIntSafe(val, min = 0, max = 999999) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < min || n > max) return null;
  return n;
}

/**
 * Sanitize free-text input: strip HTML tags, trim, and enforce max length.
 * Returns empty string for non-string input.
 */
export function sanitizeText(str, maxLen = 2000) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLen);
}

/**
 * Sanitize a name field: strip newlines, HTML tags, and control characters.
 * Prevents email header injection and XSS via display names.
 */
export function sanitizeName(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\n\r<>]/g, '')
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
    .trim()
    .slice(0, 100);
}

/**
 * Validate an array of UUIDs. Returns only valid UUIDs.
 * Use before interpolating IDs into queries.
 */
export function filterValidUUIDs(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.filter(id => isValidUUID(id));
}

/**
 * Check if text contains external URLs (not padmagnet.com).
 * Useful for flagging potentially phishing messages.
 */
export function hasExternalUrl(text) {
  if (typeof text !== 'string') return false;
  return /https?:\/\/(?!padmagnet\.com)/i.test(text);
}
