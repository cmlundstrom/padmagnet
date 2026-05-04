// Seeds a unique test owner via Supabase Admin API WITH a display_name
// set, so the post-signin firstTime Edit Profile gate is correctly
// SKIPPED. Used by smokes that exercise authenticated-owner screens
// (e.g. /settings/subscription) where the firstTime interposition
// would derail the flow.
//
// Difference from seed_test_owner.js: that helper omits display_name
// (firstTime gate fires). This helper sets it (gate skips). Both can
// coexist — pick whichever fixture matches the smoke's auth posture.
//
// Exposes: output.seed.owner = { email, password, userId }

const timestamp = Date.now();
const email = 'maestro-owner-named-' + timestamp + '@test.padmagnet.com';
const password = 'MaestroTest123!';

const response = http.post(
  SUPABASE_URL + '/auth/v1/admin/users',
  {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { role: 'owner', display_name: 'Maestro Owner' },
    }),
  }
);

if (!response.ok) {
  throw new Error('Seed named owner failed: HTTP ' + response.status + ' — ' + response.body);
}

const user = json(response.body);
output.seed = output.seed || {};
output.seed.owner = {
  email: email,
  password: password,
  userId: user.id,
};
