// Verifies that POST /api/account/migrate-anon successfully moved the
// pre-auth heart-tap save from the (anonymous) user_id to the seeded
// authed user_id (ANONSAVE_USER_ID). Queries swipes via service-role
// REST. Asserts at least one direction='right' row exists for the
// authed user — the heart-tap from the smoke.

if (!ANONSAVE_USER_ID) {
  throw new Error('verify_anon_swipes_migrated: ANONSAVE_USER_ID env not set');
}

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
};

const resp = http.get(
  SUPABASE_URL + '/rest/v1/swipes?user_id=eq.' + ANONSAVE_USER_ID +
    '&direction=eq.right&select=id,listing_id,direction,created_at',
  { headers: adminHeaders }
);

if (!resp.ok) {
  throw new Error('verify_anon_swipes_migrated: HTTP ' + resp.status + ' — ' + resp.body);
}

const rows = json(resp.body);
if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error(
    'verify_anon_swipes_migrated: 0 right-swipes found for authed user ' +
    ANONSAVE_USER_ID +
    ' — migration FAILED (anon save was not moved to the new authed user_id)'
  );
}

console.log(
  'verify_anon_swipes_migrated: ' + rows.length +
  ' right-swipe(s) migrated to authed user — listing_id(s): ' +
  rows.map(function(r) { return r.listing_id; }).join(', ')
);
