// Hard-deletes the unconfirmed auth user seeded for the
// email_not_confirmed resend smoke. PENDING_USER_ID is injected by
// the wrapper via -e flag.

if (!PENDING_USER_ID) {
  console.log('cleanup_pending_user: PENDING_USER_ID env not set — skipping');
} else {
  const adminHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  };

  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + PENDING_USER_ID,
    { headers: adminHeaders }
  );

  if (!resp.ok) {
    console.log('cleanup_pending_user: HTTP ' + resp.status + ' — ' + resp.body);
  } else {
    console.log('cleanup_pending_user: deleted ' + PENDING_USER_ID);
  }
}
