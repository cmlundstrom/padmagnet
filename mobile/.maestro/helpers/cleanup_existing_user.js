// Hard-deletes the auth user seeded for the wrong-PW + Account-exists
// smoke. Cascades the profile row + any other tables FK'd to auth.users.
// EXISTING_USER_ID is injected by the wrapper via -e flag.

if (!EXISTING_USER_ID) {
  console.log('cleanup_existing_user: EXISTING_USER_ID env not set — skipping');
} else {
  const adminHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  };

  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + EXISTING_USER_ID,
    { headers: adminHeaders }
  );

  if (!resp.ok) {
    console.log('cleanup_existing_user: HTTP ' + resp.status + ' — ' + resp.body);
  } else {
    console.log('cleanup_existing_user: deleted ' + EXISTING_USER_ID);
  }
}
