// Seeds a fresh test user whose profile is pre-archived so the
// Welcome-Back reactivation smoke has a deterministic fixture.
//
// Steps:
//   1. POST /auth/v1/admin/users (email_confirm:true) → trigger creates
//      a profiles row with role=tenant, archived_at=NULL.
//   2. PATCH /rest/v1/profiles → set archived_at = NOW() and a
//      display_name (so the modal can greet by name in the smoke).
//
// Exposes:
//   output.archivedUser = { email, password, userId, displayName }
//
// The companion cleanup_archived_user.js hard-deletes the auth user
// (cascades the profile row via FK) at the end of the smoke.

const timestamp = Date.now();
const email = 'maestro-archived-' + timestamp + '@test.padmagnet.com';
const password = 'MaestroTest123!';
const displayName = 'Archived Tester';

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
};

// 1. Create auth user (handle_new_user trigger fires synchronously and
//    inserts the matching profiles row).
const createResp = http.post(
  SUPABASE_URL + '/auth/v1/admin/users',
  {
    headers: adminHeaders,
    body: JSON.stringify({
      email: email,
      password: password,
      email_confirm: true,
    }),
  }
);

if (!createResp.ok) {
  throw new Error('seed_archived_user: create HTTP ' + createResp.status + ' — ' + createResp.body);
}

const created = json(createResp.body);
const userId = created.id;
if (!userId) {
  throw new Error('seed_archived_user: admin create returned no id — ' + createResp.body);
}

// 2. Pre-archive the profile via PostgREST + add display_name so the
//    Welcome-Back modal has a friendly greeting in the smoke. Service
//    role bypasses RLS.
const archiveTs = new Date().toISOString();
const patchResp = http.patch(
  SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId,
  {
    headers: Object.assign({}, adminHeaders, { 'Prefer': 'return=minimal' }),
    body: JSON.stringify({
      archived_at: archiveTs,
      display_name: displayName,
    }),
  }
);

if (!patchResp.ok) {
  throw new Error('seed_archived_user: patch HTTP ' + patchResp.status + ' — ' + patchResp.body);
}

output.archivedUser = {
  email: email,
  password: password,
  userId: userId,
  displayName: displayName,
  archivedAt: archiveTs,
};

console.log('seed_archived_user: created + archived user ' + userId + ' (' + email + ')');
