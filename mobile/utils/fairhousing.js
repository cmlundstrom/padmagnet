// Fair Housing Act — Protected-Class Input Filtering
// Blocks race, color, religion, sex, disability, familial status, national origin
// from being used in any scoring, filtering, or display logic.

const PROTECTED_FIELDS = [
  'race', 'color', 'religion', 'sex', 'gender',
  'disability', 'handicap', 'familial_status',
  'national_origin', 'ethnicity', 'marital_status',
];

/**
 * Strips any protected-class fields from an input object.
 * Used before PadScore calculation and preference storage.
 */
export function stripProtectedFields(input) {
  const clean = { ...input };
  for (const field of PROTECTED_FIELDS) {
    delete clean[field];
  }
  return clean;
}

/**
 * Checks if a field name references a protected class.
 */
export function isProtectedField(fieldName) {
  return PROTECTED_FIELDS.includes(fieldName.toLowerCase());
}
