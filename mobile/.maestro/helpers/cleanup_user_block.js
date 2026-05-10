// Deletes any user_blocks row between BLOCKER_EMAIL and BLOCKED_EMAIL.
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   BLOCKER_EMAIL
//   BLOCKED_EMAIL
//
// Idempotent — no-op when no row exists. Use post-smoke to ensure the
// block created by the test (or by seed_user_block.js) doesn't bleed
// state into subsequent runs.

const headers = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
};

function resolveId(email) {
  const res = http.get(
    SUPABASE_URL + '/rest/v1/profiles?email=eq.' + encodeURIComponent(email) + '&select=id',
    { headers: headers }
  );
  if (!res.ok) return null;
  const rows = json(res.body);
  return rows.length ? rows[0].id : null;
}

const blockerId = resolveId(BLOCKER_EMAIL);
const blockedId = resolveId(BLOCKED_EMAIL);

if (!blockerId || !blockedId) {
  // One side missing — nothing to clean up
} else {
  const url = SUPABASE_URL + '/rest/v1/user_blocks'
    + '?blocker_id=eq.' + blockerId
    + '&blocked_id=eq.' + blockedId;
  http.delete(url, { headers: headers });
}
