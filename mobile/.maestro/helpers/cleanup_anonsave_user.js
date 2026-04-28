// Hard-deletes the auth user seeded for the anon-save-migration smoke.
// ANONSAVE_USER_ID injected by the wrapper via -e flag.

if (!ANONSAVE_USER_ID) {
  console.log('cleanup_anonsave_user: ANONSAVE_USER_ID env not set — skipping');
} else {
  const adminHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  };

  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + ANONSAVE_USER_ID,
    { headers: adminHeaders }
  );

  if (!resp.ok) {
    console.log('cleanup_anonsave_user: HTTP ' + resp.status + ' — ' + resp.body);
  } else {
    console.log('cleanup_anonsave_user: deleted ' + ANONSAVE_USER_ID);
  }
}
