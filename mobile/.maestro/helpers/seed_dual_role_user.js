// Seeds a unique dual-role test user (tenant + owner) via Supabase Admin API.
// RoleSwitcher only renders for users with roles.length > 1, so the role_switch
// smoke flow needs this rather than the single-role seeds.
//
// Two-step process: create the auth user with role='tenant' (so sign-in lands
// in tenant view by default), then PATCH the profile row to add 'owner' to the
// roles array. The on-insert trigger from migration 004 creates the profile
// with role from user_metadata; we extend the roles array after.
//
// Exposes: output.seed.dualRole = { email, password, userId }

const timestamp = Date.now();
const email = 'maestro-dual-' + timestamp + '@test.padmagnet.com';
const password = 'MaestroTest123!';

// Step 1: create the auth user
const createResp = http.post(
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

if (!createResp.ok) {
  throw new Error('Seed dual-role user (create) failed: HTTP ' + createResp.status + ' — ' + createResp.body);
}

const user = json(createResp.body);

// Step 2: extend the roles array to include owner. Use service-role REST
// (bypasses RLS) with PATCH to merge into the trigger-created profile row.
const patchResp = http.request(
  SUPABASE_URL + '/rest/v1/profiles?id=eq.' + user.id,
  {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      roles: ['tenant', 'owner'],
    }),
  }
);

if (!patchResp.ok) {
  throw new Error('Seed dual-role user (patch roles) failed: HTTP ' + patchResp.status + ' — ' + patchResp.body);
}

output.seed = output.seed || {};
output.seed.dualRole = {
  email: email,
  password: password,
  userId: user.id,
};
