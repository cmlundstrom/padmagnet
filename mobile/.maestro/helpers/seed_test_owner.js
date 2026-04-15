// Seeds a unique test owner via Supabase Admin API.
// Exposes: output.seed.owner = { email, password, userId }

const timestamp = Date.now();
const email = 'maestro-owner-' + timestamp + '@test.padmagnet.com';
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
      user_metadata: { role: 'owner' },
    }),
  }
);

if (!response.ok) {
  throw new Error('Seed owner failed: HTTP ' + response.status + ' — ' + response.body);
}

const user = json(response.body);
output.seed = output.seed || {};
output.seed.owner = {
  email: email,
  password: password,
  userId: user.id,
};
