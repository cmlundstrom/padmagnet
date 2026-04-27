// Hard-deletes the auth user seeded for the Welcome-Back smoke. Cascades
// the profile row + any other tables FK'd to auth.users. GraalJS rejects
// `return` outside a function, so the no-op skip path is an if/else.

if (!output.archivedUser || !output.archivedUser.userId) {
  console.log('cleanup_archived_user: nothing to clean up — skipping');
} else {
  const adminHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  };

  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + output.archivedUser.userId,
    { headers: adminHeaders }
  );

  if (!resp.ok) {
    console.log('cleanup_archived_user: HTTP ' + resp.status + ' — ' + resp.body);
  } else {
    console.log('cleanup_archived_user: deleted ' + output.archivedUser.userId);
  }
}
