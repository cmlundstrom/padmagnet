/**
 * Auto-link helper for React Native: parses plain text into segments
 * with URLs and phone numbers identified for Linking.openURL().
 *
 * Returns array of { text, type: 'text' | 'url' | 'phone', href }
 */

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
const PHONE_REGEX = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;

export function parseAutolinks(text) {
  if (!text) return [];

  // Combined regex to split on URLs and phone numbers
  const combined = new RegExp(`(${URL_REGEX.source})|(${PHONE_REGEX.source})`, 'gi');

  const segments = [];
  let lastIndex = 0;

  for (const match of text.matchAll(combined)) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), type: 'text' });
    }

    const value = match[0];
    if (value.match(/^https?:\/\//i)) {
      segments.push({ text: value, type: 'url', href: value });
    } else {
      const digits = value.replace(/\D/g, '');
      segments.push({ text: value, type: 'phone', href: `tel:${digits}` });
    }

    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), type: 'text' });
  }

  return segments;
}
