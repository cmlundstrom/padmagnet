// Captures SEED_USER_ID + SEED_EMAIL + SEED_ROLE env vars (set by the
// wrapper's mint_magic_link_url.sh call) into output.seed so the existing
// cleanup_test_users.js helper can hard-delete the user at end-of-flow.
//
// Wrapper passes these via `maestro test -e SEED_USER_ID=... -e SEED_EMAIL=...
// -e SEED_ROLE=renter|owner`. The variables are exposed to runScript JS as
// global identifiers (same convention as SUPABASE_URL etc.).

if (!SEED_USER_ID || !SEED_EMAIL) {
  throw new Error('init_magic_link_seed: SEED_USER_ID or SEED_EMAIL env var missing — wrapper script must mint a magic link first.');
}

output.seed = output.seed || {};
const role = (typeof SEED_ROLE !== 'undefined' && SEED_ROLE === 'owner') ? 'owner' : 'renter';
output.seed[role] = {
  email: SEED_EMAIL,
  userId: SEED_USER_ID,
};

console.log('init_magic_link_seed: ' + role + ' ' + SEED_EMAIL + ' (' + SEED_USER_ID + ')');
