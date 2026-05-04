// Formatting utilities

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDistance(miles) {
  if (miles < 0.1) return 'Nearby';
  if (miles < 1) return `${(miles * 5280).toFixed(0)} ft`;
  return `${miles.toFixed(1)} mi`;
}

export function formatBedsBaths(beds, baths) {
  const b = beds === 0 ? 'Studio' : `${beds} bd`;
  return `${b} • ${baths} ba`;
}

/**
 * Title Case — capitalize first letter of each word.
 * Handles common address abbreviations (St, Ave, Blvd, etc.)
 */
export function toTitleCase(str) {
  if (!str) return str;
  return str.trim().replace(/\s+/g, ' ').replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/**
 * Sentence case — capitalize first letter, rest lowercase.
 * Preserves capitalization after periods for multi-sentence text.
 */
export function toSentenceCase(str) {
  if (!str) return str;
  return str.trim().replace(/\s+/g, ' ').replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  }).replace(/^[a-z]/, (c) => c.toUpperCase());
}

export function formatPriceCents(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
