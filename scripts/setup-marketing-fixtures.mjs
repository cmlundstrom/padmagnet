/**
 * Set up the Top Gun marketing fixtures + retag the smoke fixtures.
 *
 * Phase A — rename existing smoke fixtures (non-destructive update):
 *   privacy@padmagnet.com  display_name → "Maverick Testowner"
 *   support@padmagnet.com  display_name → "Goosie Testrenter"
 *
 * Phase B — create NEW marketing accounts for the Google Play demo video:
 *   maverick@padmagnet.com  display "Maverick"  role owner   phone +17722016363
 *   goose@padmagnet.com     display "Goose"     role tenant  phone +17723072965
 *
 * Phones intentionally overlap with the smoke fixtures so the same physical
 * phone receives Twilio SMS for either account. profiles.phone has no
 * uniqueness constraint (only communications has the tuple unique on
 * twilio_number + user_phone).
 *
 * Generates strong passwords for the new accounts, writes them to .env.local
 * as new env vars (PADMAGNET_MARKETING_OWNER_PW, PADMAGNET_MARKETING_RENTER_PW),
 * and prints them once to stdout. Existing smoke creds are untouched.
 *
 * Pass --execute to actually write. Default is dry-run.
 */

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env.local');
const envFile = readFileSync(ENV_PATH, 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1).replace(/^"/, '').replace(/"$/, '');
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const EXECUTE = process.argv.includes('--execute');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

// ── Phase A: smoke fixtures (existing accounts, display_name update only) ──
const SMOKE_RENAMES = [
  {
    id: '70f1be57-c94a-48a9-a2ad-074b611eab79',
    email: 'privacy@padmagnet.com',
    newName: 'Maverick Testowner',
  },
  {
    id: '0d560bf1-3247-4543-8bbc-7df04ab5021f',
    email: 'support@padmagnet.com',
    newName: 'Goosie Testrenter',
  },
];

// ── Phase B: marketing fixtures (NEW accounts) ──
const MARKETING_NEW = [
  {
    email: 'maverick@padmagnet.com',
    displayName: 'Maverick',
    role: 'owner',
    phone: '+17722016363',
    envVar: 'PADMAGNET_MARKETING_OWNER_PW',
  },
  {
    email: 'goose@padmagnet.com',
    displayName: 'Goose',
    role: 'tenant',
    phone: '+17723072965',
    envVar: 'PADMAGNET_MARKETING_RENTER_PW',
  },
];

function strongPassword() {
  // 24 bytes → ~32 base64 chars, plenty of entropy, URL-safe.
  return randomBytes(24).toString('base64').replace(/[+/=]/g, c => ({ '+': 'A', '/': 'B', '=': '' }[c]));
}

async function getProfile(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=id,display_name,email`,
    { headers }
  );
  if (!res.ok) throw new Error(`GET profile ${id} → ${res.status} ${await res.text()}`);
  return (await res.json())[0] || null;
}

async function getAuthUser(id) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers });
  if (!res.ok) throw new Error(`GET auth.users ${id} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function findAuthUserByEmail(email) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(`email.eq.${email}`)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`list users → ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.users || []).find(u => u.email === email) || null;
}

async function patchProfile(id, fields) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(fields),
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

async function createAuthUser({ email, password, role, displayName }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, display_name: displayName },
    }),
  });
  if (!res.ok) throw new Error(`create user ${email} → ${res.status} ${await res.text()}`);
  return res.json();
}

console.log(`\n=== Marketing fixture setup ${EXECUTE ? '(EXECUTE)' : '(DRY RUN)'} ===\n`);

// ── Phase A ──
console.log('── Phase A: Smoke fixture renames ──\n');
for (const f of SMOKE_RENAMES) {
  const profile = await getProfile(f.id);
  const auth = await getAuthUser(f.id);
  if (!profile) {
    console.log(`• ${f.email} — profile not found, skip`);
    continue;
  }
  console.log(`• ${f.email}  (${f.id})`);
  console.log(`   profiles.display_name        : "${profile.display_name}" → "${f.newName}"`);
  console.log(`   auth.user_metadata.display   : "${auth.user_metadata?.display_name ?? '(unset)'}" → "${f.newName}"`);

  if (EXECUTE) {
    await patchProfile(f.id, { display_name: f.newName });
    await putAuthUserMetadata(f.id, auth.user_metadata, f.newName);
    console.log(`   ✓ updated\n`);
  } else {
    console.log(`   (dry-run)\n`);
  }
}

// ── Phase B ──
console.log('── Phase B: Marketing fixture creation ──\n');

const newCreds = []; // collected for later .env.local writeback

for (const m of MARKETING_NEW) {
  const existing = await findAuthUserByEmail(m.email);
  console.log(`• ${m.email}  display="${m.displayName}"  role=${m.role}  phone=${m.phone}`);

  if (existing) {
    console.log(`   ⚠  account already exists (id=${existing.id}) — will only sync display + phone, NOT reset password`);
    if (EXECUTE) {
      await patchProfile(existing.id, {
        display_name: m.displayName,
        phone: m.phone,
        email: m.email,
        role: m.role,
      });
      await putAuthUserMetadata(existing.id, existing.user_metadata, m.displayName);
      console.log(`   ✓ profile/metadata synced\n`);
    } else {
      console.log(`   (dry-run)\n`);
    }
    continue;
  }

  const password = strongPassword();
  console.log(`   would CREATE user with auto-generated password`);
  console.log(`   → ${m.envVar} will be added to .env.local`);

  if (EXECUTE) {
    const created = await createAuthUser({
      email: m.email,
      password,
      role: m.role,
      displayName: m.displayName,
    });
    // Trigger handle_new_user has already inserted the profile row.
    // Patch it with role + phone (trigger doesn't set those).
    await patchProfile(created.id, {
      role: m.role,
      phone: m.phone,
    });
    newCreds.push({ envVar: m.envVar, password, email: m.email, id: created.id });
    console.log(`   ✓ created auth user id=${created.id} + patched profile\n`);
  } else {
    console.log(`   (dry-run)\n`);
  }
}

// ── Persist new passwords to .env.local ──
if (EXECUTE && newCreds.length) {
  const lines = ['', '# Marketing demo fixtures (Google Play video) — added by setup-marketing-fixtures.mjs'];
  for (const c of newCreds) lines.push(`${c.envVar}=${c.password}`);
  appendFileSync(ENV_PATH, lines.join('\n') + '\n');

  console.log('── New credentials (saved to .env.local — DO NOT commit) ──\n');
  for (const c of newCreds) {
    console.log(`  ${c.envVar}=${c.password}`);
    console.log(`     login: ${c.email}   id: ${c.id}\n`);
  }
}

console.log(EXECUTE ? '✓ done.' : '\nDry-run complete. Re-run with --execute to apply.');
