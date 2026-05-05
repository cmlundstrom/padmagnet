// Verifies that tenant_preferences.property_types contains "Single Family"
// after the preferences smoke tapped the chip.
//
// Reads the seeded renter's tenant_preferences row via service-role REST
// and throws unless property_types includes "Single Family". This is the
// load-bearing assertion that proves the immediateSave path actually
// upserted to the DB (not just flipped the local form state).
//
// /api/preferences PUT was service-role from day one (see
// app/api/preferences/route.js), so this isn't gating an RLS fix —
// it's gating that the network call fires AND completes AND that the
// upsert lands on the right row. Mirrors the structure of
// verify_preferred_channel_email.js.

if (!output.seed || !output.seed.renter || !output.seed.renter.userId) {
  throw new Error('verify_property_type_single_family: output.seed.renter.userId not set — was seed_test_renter.js run?');
}

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
};

const resp = http.get(
  SUPABASE_URL + '/rest/v1/tenant_preferences?user_id=eq.' + output.seed.renter.userId + '&select=property_types',
  { headers: adminHeaders }
);

if (!resp.ok) {
  throw new Error('verify_property_type_single_family: REST GET HTTP ' + resp.status + ' — ' + resp.body);
}

const rows = json(resp.body);
if (!rows || rows.length === 0) {
  throw new Error('verify_property_type_single_family: tenant_preferences row not found for userId ' + output.seed.renter.userId + ' — upsert did not fire');
}

const types = rows[0].property_types || [];
if (!Array.isArray(types) || types.indexOf('Single Family') === -1) {
  throw new Error('verify_property_type_single_family: expected "Single Family" in property_types, got ' + JSON.stringify(types));
}

console.log('verify_property_type_single_family: confirmed property_types includes Single Family for ' + output.seed.renter.userId);
