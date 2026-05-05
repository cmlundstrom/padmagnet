// Verifies that tenant_preferences.budget_max equals 2750 after the
// preferences debounced-text-input smoke typed "2750" into the
// Max $/mo field and waited past the 1500ms debounce window.
//
// Mirrors verify_property_type_single_family.js but for the
// scheduleSave path (text inputs) instead of immediateSave (chips).
// Both share /api/preferences PUT — what differs is when the call
// fires:
//   - chips: synchronously on tap (immediateSave)
//   - text inputs: 1500ms after the last keystroke (scheduleSave)
//
// Why 2750: a number that's not the schema/seed default (which is
// null for fresh tenant_preferences rows), not the buildPayload
// fallback (5000 when budget_max is empty per preferences.js:95),
// and visually distinct from any test fixture default. If the verify
// fires too early (before debounce + roundtrip complete), the row
// will either not exist OR have budget_max=null — distinguishable
// errors from an actual write of 2750.

if (!output.seed || !output.seed.renter || !output.seed.renter.userId) {
  throw new Error('verify_budget_max_2750: output.seed.renter.userId not set — was seed_test_renter.js run?');
}

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
};

const resp = http.get(
  SUPABASE_URL + '/rest/v1/tenant_preferences?user_id=eq.' + output.seed.renter.userId + '&select=budget_max',
  { headers: adminHeaders }
);

if (!resp.ok) {
  throw new Error('verify_budget_max_2750: REST GET HTTP ' + resp.status + ' — ' + resp.body);
}

const rows = json(resp.body);
if (!rows || rows.length === 0) {
  throw new Error('verify_budget_max_2750: tenant_preferences row not found for userId ' + output.seed.renter.userId + ' — debounced PUT did not fire (or fired too late)');
}

const budget = rows[0].budget_max;
// PostgREST returns numeric columns as JS numbers; budget_max is numeric in the schema.
if (budget !== 2750) {
  throw new Error('verify_budget_max_2750: expected 2750, got ' + JSON.stringify(budget));
}

console.log('verify_budget_max_2750: confirmed budget_max=2750 for ' + output.seed.renter.userId);
