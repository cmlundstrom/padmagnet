/**
 * Surgical hard-delete of 504 Colorado Ave listing(s) for info@floridapm.net.
 *
 * Context: duplicate-row bug (commit 94a4e8b fix) left two rows — one draft,
 * one pending_review — and orphan storage photos. Both are test artifacts;
 * permanent delete is approved per project_no_full_delete.md carve-out for
 * testing.
 *
 * Pass --execute to actually delete. Default is dry-run.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
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
const OWNER_EMAIL = 'info@floridapm.net';
const STREET_NUMBER = '504';
const STREET_NAME_NEEDLE = 'Colorado'; // case-insensitive partial on street_name

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} → ${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

// Extract storage object path from a public URL like:
//   https://<project>.supabase.co/storage/v1/object/public/listing-photos/<user>/<listing>/<file>.jpg
function pathFromUrl(url) {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/listing-photos\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function main() {
  console.log(`\n=== 504 Colorado surgical delete ${EXECUTE ? '(EXECUTING)' : '(DRY RUN)'} ===\n`);

  // 1. Find owner user_id by email
  const profiles = await rest(`/profiles?email=eq.${encodeURIComponent(OWNER_EMAIL)}&select=id,email,display_name`);
  if (!profiles.length) {
    console.error(`No profile found for ${OWNER_EMAIL}`);
    process.exit(1);
  }
  const ownerId = profiles[0].id;
  console.log(`Owner: ${OWNER_EMAIL} (${ownerId})`);

  // 2. Find all listings for this owner matching 504 Colorado
  const listings = await rest(
    `/listings?owner_user_id=eq.${ownerId}` +
      `&street_number=eq.${STREET_NUMBER}` +
      `&street_name=ilike.*${encodeURIComponent(STREET_NAME_NEEDLE)}*` +
      `&select=id,listing_key,street_number,street_name,city,state_or_province,status,list_price,photos,created_at`,
  );

  if (!listings.length) {
    console.log('No 504 Colorado listings found. Nothing to delete.');
    return;
  }

  console.log(`Found ${listings.length} matching listing row(s):\n`);
  for (const l of listings) {
    const photoCount = Array.isArray(l.photos) ? l.photos.length : 0;
    const addr = `${l.street_number} ${l.street_name}, ${l.city}, ${l.state_or_province}`;
    console.log(`  • id=${l.id}`);
    console.log(`    listing_key=${l.listing_key}`);
    console.log(`    address=${addr}`);
    console.log(`    status=${l.status}  price=$${l.list_price}/mo`);
    console.log(`    photos=${photoCount}`);
    console.log(`    created=${l.created_at}\n`);
  }

  // 3. Collect all storage object paths from photos[].url and photos[].thumb_url
  const storagePaths = new Set();
  for (const l of listings) {
    if (!Array.isArray(l.photos)) continue;
    for (const p of l.photos) {
      const u = pathFromUrl(p.url);
      const t = pathFromUrl(p.thumb_url);
      if (u) storagePaths.add(u);
      if (t) storagePaths.add(t);
    }
  }

  // 4. Also list all storage objects under listing-photos/<ownerId>/<listingId>/
  //    to catch orphaned files not referenced in photos[] (failed uploads, etc).
  for (const l of listings) {
    try {
      const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/listing-photos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prefix: `${ownerId}/${l.id}`, limit: 1000 }),
      });
      if (listRes.ok) {
        const objs = await listRes.json();
        for (const obj of objs) {
          storagePaths.add(`${ownerId}/${l.id}/${obj.name}`);
        }
      }
    } catch (e) {
      console.warn(`  storage list for ${l.id} failed: ${e.message}`);
    }
  }

  console.log(`Storage objects to delete: ${storagePaths.size}`);
  for (const p of storagePaths) console.log(`  - ${p}`);

  if (!EXECUTE) {
    console.log('\n(dry run — re-run with --execute to perform deletes)');
    return;
  }

  // 5. Delete storage objects first, then DB rows.
  if (storagePaths.size) {
    const delRes = await fetch(`${SUPABASE_URL}/storage/v1/object/listing-photos`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ prefixes: [...storagePaths] }),
    });
    const delBody = await delRes.text();
    console.log(`\nStorage delete → ${delRes.status}`);
    if (!delRes.ok) console.log(delBody);
    else console.log(`  removed ${storagePaths.size} object(s)`);
  }

  // 6. Hard-delete listing rows (cascades to listing_photos, favorites, etc if FK set up)
  for (const l of listings) {
    await rest(`/listings?id=eq.${l.id}`, { method: 'DELETE' });
    console.log(`DB row deleted: ${l.id} (${l.status})`);
  }

  console.log('\n✓ Surgical delete complete.\n');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
