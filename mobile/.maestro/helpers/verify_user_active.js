// Reads back the seeded user's profile and asserts archived_at IS NULL.
// Proves /api/account/reactivate actually wrote to the DB — without this,
// the smoke would only verify that the modal dismissed client-side.
//
// ARCHIVED_USER_ID is injected by the wrapper (-e flag on the maestro
// invocation) since the user is seeded in bash before maestro starts.

if (!ARCHIVED_USER_ID) {
  throw new Error('verify_user_active: ARCHIVED_USER_ID env not set — wrapper must seed before launching maestro');
}

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
};

const resp = http.get(
  SUPABASE_URL + '/rest/v1/profiles?id=eq.' + ARCHIVED_USER_ID + '&select=id,archived_at',
  { headers: adminHeaders }
);

if (!resp.ok) {
  throw new Error('verify_user_active: HTTP ' + resp.status + ' — ' + resp.body);
}

const rows = json(resp.body);
if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error('verify_user_active: profile row missing for ' + ARCHIVED_USER_ID);
}

if (rows[0].archived_at !== null) {
  throw new Error('verify_user_active: archived_at still set (' + rows[0].archived_at + ') — reactivate did not persist');
}

console.log('verify_user_active: archived_at IS NULL — reactivation persisted to DB');
