// Hard-deletes the auth user seeded for the intent-preservation smoke.
// INTENT_USER_ID injected by the wrapper via -e flag.

if (!INTENT_USER_ID) {
  console.log('cleanup_intent_user: INTENT_USER_ID env not set — skipping');
} else {
  const adminHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  };

  // Delete any conversations + messages this user created during the
  // smoke (sendFirstMessage POSTs to /api/conversations). We can't
  // easily filter from here, so the smoke's auth user delete cascades
  // via FK if the conversation tables are wired with ON DELETE CASCADE
  // on tenant_user_id. If not, the orphan conversation rows are
  // harmless test artifacts.

  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + INTENT_USER_ID,
    { headers: adminHeaders }
  );

  if (!resp.ok) {
    console.log('cleanup_intent_user: HTTP ' + resp.status + ' — ' + resp.body);
  } else {
    console.log('cleanup_intent_user: deleted ' + INTENT_USER_ID);
  }
}
