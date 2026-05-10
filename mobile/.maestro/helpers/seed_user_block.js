// Seeds a user_blocks row.
//
// Required env vars (passed via `maestro test -e ...`):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   BLOCKER_EMAIL  — email of the user doing the blocking
//   BLOCKED_EMAIL  — email of the user being blocked
//
// Resolves both emails to UUIDs via the profiles table, then upserts
// user_blocks(blocker_id, blocked_id). Idempotent — safe to call when
// a row already exists.
//
// Used by smokes that need a pre-existing block (e.g., unblock_from_settings).
// Smokes that exercise the BLOCK action itself don't need this — they
// create the row via the UI under test.

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
  if (!res.ok) throw new Error('Failed to resolve ' + email + ': HTTP ' + res.status);
  const rows = json(res.body);
  if (!rows.length) throw new Error('No profile for ' + email);
  return rows[0].id;
}

const blockerId = resolveId(BLOCKER_EMAIL);
const blockedId = resolveId(BLOCKED_EMAIL);

const upsertHeaders = Object.assign({}, headers, {
  'Prefer': 'resolution=merge-duplicates,return=minimal',
});

const upsertRes = http.post(
  SUPABASE_URL + '/rest/v1/user_blocks',
  {
    headers: upsertHeaders,
    body: JSON.stringify({
      blocker_id: blockerId,
      blocked_id: blockedId,
      reason_code: 'maestro_seed',
      free_text: 'Pre-seeded by maestro smoke test',
    }),
  }
);

if (!upsertRes.ok) {
  throw new Error('user_blocks upsert failed: HTTP ' + upsertRes.status + ' — ' + upsertRes.body);
}

output.seed = output.seed || {};
output.seed.block = { blocker_id: blockerId, blocked_id: blockedId };
