// Hard-deletes the auth user seeded for the L1 firstTime-interposition
// smoke. Cascades the profile row + any other tables FK'd to auth.users.
// GraalJS rejects `return` outside a function, so the no-op skip path
// is an if/else.

if (!NONAME_USER_ID) {
  console.log('cleanup_noname_user: NONAME_USER_ID env not set — skipping');
} else {
  const adminHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  };

  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + NONAME_USER_ID,
    { headers: adminHeaders }
  );

  if (!resp.ok) {
    console.log('cleanup_noname_user: HTTP ' + resp.status + ' — ' + resp.body);
  } else {
    console.log('cleanup_noname_user: deleted ' + NONAME_USER_ID);
  }
}
