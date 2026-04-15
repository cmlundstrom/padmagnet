// Seeds a unique test renter via Supabase Admin API.
// Requires env vars passed via `maestro test -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=...`
// Exposes: output.seed.renter = { email, password, userId }
//
// Note: PadMagnet uses "Renter" in UI but `tenant` in DB — role stays `tenant`.

const timestamp = Date.now();
const email = 'maestro-renter-' + timestamp + '@test.padmagnet.com';
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
  throw new Error('Seed renter failed: HTTP ' + response.status + ' — ' + response.body);
}

const user = json(response.body);
output.seed = output.seed || {};
output.seed.renter = {
  email: email,
  password: password,
  userId: user.id,
};
