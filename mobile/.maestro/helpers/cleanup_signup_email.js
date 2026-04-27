// Hard-deletes the Supabase auth user created by the L1 sign-up smoke.
// Tolerates missing userId (signup might have failed before verify ran).
// Maestro's GraalJS engine evaluates top-level scripts in a context that
// rejects `return` outside a function — so the early-skip path is an
// if/else instead of a guarded return.

if (!output.signupEmail || !output.signupEmail.userId) {
  console.log('cleanup_signup_email: no userId to delete — skipping');
} else {
  const adminHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  };

  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + output.signupEmail.userId,
    { headers: adminHeaders }
  );

  if (!resp.ok) {
    console.log('cleanup_signup_email: HTTP ' + resp.status + ' — ' + resp.body);
  } else {
    console.log('cleanup_signup_email: deleted ' + output.signupEmail.userId);
  }
}
