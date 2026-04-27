// Verifies the L1 sign-up flow actually created a Supabase auth user.
// Reads back via the admin /auth/v1/admin/users endpoint, filtered by
// the signup email. Throws if no user is found (smoke fails).
// Stashes the discovered user id on output.signupEmail.userId so the
// cleanup helper can hard-delete it later.

if (!output.signupEmail || !output.signupEmail.email) {
  throw new Error('verify_signup_user_exists: output.signupEmail not set — was seed_signup_email.js run?');
}

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
};

// /auth/v1/admin/users?email=... is supported on supabase-js v2 admin API
const resp = http.get(
  SUPABASE_URL + '/auth/v1/admin/users?email=' + encodeURIComponent(output.signupEmail.email),
  { headers: adminHeaders }
);

if (!resp.ok) {
  throw new Error('verify_signup_user_exists: admin lookup HTTP ' + resp.status + ' — ' + resp.body);
}

const body = json(resp.body);
const users = body.users || [];
if (users.length === 0) {
  throw new Error('verify_signup_user_exists: no auth user found for ' + output.signupEmail.email + ' — signUp() did not actually create the account');
}

output.signupEmail.userId = users[0].id;
console.log('verify_signup_user_exists: confirmed user ' + output.signupEmail.userId + ' for ' + output.signupEmail.email);
