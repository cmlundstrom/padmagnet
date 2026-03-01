// PadScore™ — Deterministic preference-matching engine
// Rule-based weighted scoring (NOT AI/ML — per MLS agreement compliance)
// See padscore-compliance.md for legal defense documentation
//
// Inputs: tenant preferences + listing attributes
// Output: 0-100 score + plain-language explanation
//
// Implementation will be built when IDX data is available.
// This file is the single source of truth for scoring logic.

export function calculatePadScore(preferences, listing) {
  // TODO: Implement when Bridge API data flows in
  // Each factor: compare preference vs listing attribute → 0-1 match ratio
  // Weighted sum → normalize to 0-100
  // Log: inputs, weights, output, timestamp, hashed user ID
  return { score: 0, explanation: '', factors: [] };
}

export function explainScore(factors) {
  // Generate plain-language explanation
  // e.g. "Shown because it matches your budget and location"
  const matched = factors.filter(f => f.match > 0.5).map(f => f.label);
  if (matched.length === 0) return 'Limited match with your preferences.';
  return `Shown because it matches your ${matched.join(', ')}.`;
}
