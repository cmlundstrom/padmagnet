/**
 * Rename persistent test fixtures to Top Gun first-names only.
 *
 *   Maverick Lundstrom → Maverick   (privacy@padmagnet.com)
 *   Goosie  Lundstrom  → Goose      (support@padmagnet.com)
 *
 * Drops the shared "Lundstrom" surname so the demo video shows clean
 * first-names. Updates BOTH profiles.display_name and
 * auth.users.user_metadata.display_name (the trigger only fires on
 * INSERT, so an UPDATE has to touch both manually).
 *
 * Pass --execute to actually write. Default is dry-run.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './load-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Env from 1Password via `op run` (process.env), or .env.local if present.
const env = loadEnv();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const EXECUTE = process.argv.includes('--execute');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const FIXTURES = [
  {
    id: '70f1be57-c94a-48a9-a2ad-074b611eab79',
    email: 'privacy@padmagnet.com',
    oldName: 'Maverick Lundstrom',
    newName: 'Maverick',
  },
  {
    id: '0d560bf1-3247-4543-8bbc-7df04ab5021f',
    email: 'support@padmagnet.com',
    oldName: 'Goosie Lundstrom',
    newName: 'Goose',
  },
];

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function getProfile(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=id,display_name,email`,
    { headers }
  );
  if (!res.ok) throw new Error(`GET profile ${id} → ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function getAuthUser(id) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers });
  if (!res.ok) throw new Error(`GET auth.users ${id} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function patchProfile(id, displayName) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (!res.ok) throw new Error(`PATCH profile ${id} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function putAuthUserMetadata(id, currentMeta, displayName) {
  const merged = { ...(currentMeta || {}), display_name: displayName };
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ user_metadata: merged }),
  });
  if (!res.ok) throw new Error(`PUT auth.users ${id} → ${res.status} ${await res.text()}`);
  return res.json();
}

console.log(`\n=== Top Gun fixture rename ${EXECUTE ? '(EXECUTE)' : '(DRY RUN)'} ===\n`);

for (const f of FIXTURES) {
  console.log(`• ${f.email}  (${f.id})`);

  const profile = await getProfile(f.id);
  const auth = await getAuthUser(f.id);

  if (!profile) {
    console.log(`   ⚠  profile not found — skipping`);
    continue;
  }

  console.log(`   profiles.display_name           : "${profile.display_name}"  →  "${f.newName}"`);
  console.log(`   auth.users.meta.display_name    : "${auth.user_metadata?.display_name ?? '(unset)'}"  →  "${f.newName}"`);

  if (!EXECUTE) {
    console.log(`   (dry-run — no writes)\n`);
    continue;
  }

  await patchProfile(f.id, f.newName);
  await putAuthUserMetadata(f.id, auth.user_metadata, f.newName);
  console.log(`   ✓ updated\n`);
}

console.log(EXECUTE ? '✓ done.' : '\nDry-run complete. Re-run with --execute to apply.');
