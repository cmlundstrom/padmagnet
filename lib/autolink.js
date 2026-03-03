/**
 * Auto-link helper: converts URLs and phone numbers in plain text to HTML links.
 * Used server-side for rendering tenant_contact_instructions.
 */

const URL_REGEX = /(https?:\/\/[^\s<]+)/gi;
const PHONE_REGEX = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;

export function autolinkHtml(text) {
  if (!text) return '';
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  result = result.replace(URL_REGEX, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  result = result.replace(PHONE_REGEX, (match) => {
    const digits = match.replace(/\D/g, '');
    return `<a href="tel:${digits}">${match}</a>`;
  });
  return result;
}
