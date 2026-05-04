// Seeds a unique test renter via Supabase Admin API WITHOUT a display_name,
// so the post-signin firstTime Edit Profile interposition fires. Used by
// `renter_first_time_onboarding.yaml` which exercises the no-name gate
// end-to-end.
//
// Difference from seed_test_renter.js: that helper sets
// user_metadata.display_name='Maestro Renter' so the firstTime gate is
// SKIPPED. This helper omits display_name so the trigger leaves
// profiles.display_name=NULL (per migration 076), which is exactly what
// the firstTime interposition path needs.
//
// Exposes: output.seed.renter = { email, password, userId }

const timestamp = Date.now();
const email = 'maestro-noname-renter-' + timestamp + '@test.padmagnet.com';
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
      user_metadata: { role: 'tenant' },
    }),
  }
);

if (!response.ok) {
  throw new Error('Seed noname renter failed: HTTP ' + response.status + ' — ' + response.body);
}

const user = json(response.body);
output.seed = output.seed || {};
output.seed.renter = {
  email: email,
  password: password,
  userId: user.id,
};
