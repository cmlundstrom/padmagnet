// Surgical pre-launch test-data wipe.
//
// Deletes ALL profiles + owner listings except an explicit allow-list.
// MLS-source listings are never touched (filter source != 'owner').
//
// Default mode: DRY_RUN (no destructive action). Set WIPE_LIVE=1 to execute.
//
// Usage:
//   node scripts/wipe-test-data.mjs                # dry run
//   WIPE_LIVE=1 node scripts/wipe-test-data.mjs    # live execution
//
// Mirrors the cleanupSteps / auth.admin.deleteUser pattern from
// app/api/admin/users/route.js resetUser() so FK dependency order matches
// the canonical hard-delete path.

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const LIVE = process.env.WIPE_LIVE === '1';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Allow-list (verified 2026-05-06) ──────────────────────────────────
// Resolved by email lookup at startup, then used as authoritative ID set.
const KEEP_PROFILE_EMAILS = [
  ['cmlundstrom@gmail.com',     'super_admin'],
  ['info@floridapm.net',        'owner'],
  ['privacy@padmagnet.com',     'owner (Maverick fixture)'],
  ['support@padmagnet.com',     'tenant (Goosie fixture)'],
  ['poppylundstrom@gmail.com',  'tenant (Play tester)'],
];

// Full UUIDs for listings (no email lookup possible — these are stable).
const KEEP_LISTING_IDS = [
  ['8a0d6d7f-a33c-4b92-97c0-9056a2daa68f', '8362 SE Magnolia Ave (info@floridapm.net)'],
];

const STANDALONE_LISTING_DELETES = [
  ['9617aeba-c3b8-4fbd-b59d-cbc8a114260e', '67 SE Tioga Pl (info@floridapm.net keeps owner, listing deleted)'],
];

// ─── Helpers ───────────────────────────────────────────────────────────
function abort(msg) {
  console.error('\n❌ ABORT:', msg);
  process.exit(1);
}

async function profileIdByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(2);
  if (error) abort(`profile lookup ${email}: ${error.message}`);
  if (!data || data.length === 0) abort(`profile ${email} not found`);
  if (data.length > 1) abort(`profile ${email} matched ${data.length} rows`);
  return data[0].id;
}

async function listingIdByPrefix(shortId) {
  // listings.id is uuid; cast filter approach via REST raw filter.
  const { data, error } = await supabase
    .from('listings')
    .select('id')
    .filter('id', 'eq', shortId);
  if (error || !data) return null;
  if (data.length === 1) return data[0].id;
  // Fallback: pull all owner listings and match by prefix locally.
  const { data: all } = await supabase.from('listings').select('id').eq('source', 'owner');
  const matches = (all || []).filter(r => r.id.startsWith(shortId));
  if (matches.length === 1) return matches[0].id;
  return null;
}

// Cleanup steps from app/api/admin/users/route.js resetUser() — DO NOT
// reorder without re-checking FK constraints.
function cleanupStepsFor(userId) {
  return [
    // phone_mappings.conversation_id FK to conversations is NOT CASCADE.
    // Delete phone_mappings keyed by user_id BEFORE conversations.
    { table: 'phone_mappings',     filters: [['user_id', userId]] },
    { table: 'messages',           filters: [['sender_id', userId], ['recipient_id', userId]] },
    { table: 'conversations',      filters: [['tenant_user_id', userId], ['owner_user_id', userId]] },
    { table: 'showing_requests',   filters: [['tenant_user_id', userId]] },
    { table: 'rent_range_reports', filters: [['created_by', userId]] },
    { table: 'rent_range_shares',  filters: [['sent_by', userId]] },
    { table: 'documents',          filters: [['owner_user_id', userId], ['sent_to_user_id', userId]] },
    { table: 'availability_blocks', filters: [['owner_user_id', userId]] },
    { table: 'invoices',           filters: [['owner_user_id', userId]] },
    { table: 'ledger_entries',     filters: [['owner_user_id', userId]] },
    { table: 'payments',           filters: [['owner_user_id', userId]] },
    { table: 'subscriptions',      filters: [['user_id', userId], ['owner_user_id', userId]] },
    { table: 'owner_purchases',    filters: [['user_id', userId]] },
    { table: 'listings',           filters: [['owner_user_id', userId]] },
  ];
}

async function cleanupUser(userId) {
  const summary = {};

  // Pre-steps: webhook_logs + phone_mappings FKs to conversations/messages
  // are NOT ON DELETE CASCADE. Sever ALL links rooted in the user's
  // conversations (not just direct sender/recipient — a conversation
  // may contain messages whose sender or recipient is a different
  // party that's also being deleted, but the cascade fires from the
  // conversations delete). Discovered via wipe failures 2026-05-06.
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`tenant_user_id.eq.${userId},owner_user_id.eq.${userId}`);
  if (convs && convs.length > 0) {
    const convIds = convs.map(c => c.id);

    // Nullify webhook_logs.conversation_id
    const { error: whcErr, count: whcCount } = await supabase
      .from('webhook_logs')
      .update({ conversation_id: null }, { count: 'exact' })
      .in('conversation_id', convIds);
    if (whcErr) throw new Error(`webhook_logs.conversation_id nullify for ${userId}: ${whcErr.message}`);
    if (whcCount) summary.webhook_logs_conv_nullified = whcCount;

    // Delete phone_mappings tied to these conversations (NOT NULL on
    // conversation_id, so can't nullify — must delete the rows).
    const { error: pmErr, count: pmCount } = await supabase
      .from('phone_mappings')
      .delete({ count: 'exact' })
      .in('conversation_id', convIds);
    if (pmErr) throw new Error(`phone_mappings delete for ${userId}: ${pmErr.message}`);
    if (pmCount) summary.phone_mappings_deleted = pmCount;

    // Get ALL message IDs in those conversations (including messages
    // where neither sender nor recipient is this user) and nullify
    // webhook_logs.message_id for them — covers the cascade case.
    const { data: convMsgs } = await supabase
      .from('messages')
      .select('id')
      .in('conversation_id', convIds);
    if (convMsgs && convMsgs.length > 0) {
      const allMsgIds = convMsgs.map(m => m.id);
      const { error: whmErr, count: whmCount } = await supabase
        .from('webhook_logs')
        .update({ message_id: null }, { count: 'exact' })
        .in('message_id', allMsgIds);
      if (whmErr) throw new Error(`webhook_logs.message_id nullify for ${userId}: ${whmErr.message}`);
      if (whmCount) summary.webhook_logs_msg_nullified = whmCount;
    }
  }

  for (const step of cleanupStepsFor(userId)) {
    let total = 0;
    for (const [col, val] of step.filters) {
      const { error, count } = await supabase
        .from(step.table)
        .delete({ count: 'exact' })
        .eq(col, val);
      if (error && !['42P01', '42703', 'PGRST205'].includes(error.code)) {
        throw new Error(`Cleanup failed at ${step.table}.${col} for ${userId}: ${error.message}`);
      }
      total += count || 0;
    }
    if (total > 0) summary[step.table] = total;
  }
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
  if (authErr) throw new Error(`auth.deleteUser ${userId}: ${authErr.message}`);
  return summary;
}

async function cleanupListingStorage(listingOwnerId) {
  // Bulk wipe ALL files under {ownerUserId}/ — only safe when the entire
  // owner is being deleted, since they own no kept listings.
  try {
    const { data: files } = await supabase.storage
      .from('listing-photos')
      .list(listingOwnerId);
    if (!files || files.length === 0) return 0;
    const paths = files.map(f => `${listingOwnerId}/${f.name}`);
    const { error } = await supabase.storage.from('listing-photos').remove(paths);
    if (error) throw new Error(`storage remove ${listingOwnerId}: ${error.message}`);
    return paths.length;
  } catch (e) {
    console.warn(`  ⚠️  storage cleanup ${listingOwnerId}: ${e.message}`);
    return 0;
  }
}

// Extract storage path from a public Supabase storage URL.
// Returns e.g. "833f53d6-.../1bf1c3d9-....webp" or null if unparseable.
function extractStoragePath(url) {
  if (typeof url !== 'string') return null;
  const m = url.match(/\/listing-photos\/(.+)$/);
  return m ? m[1] : null;
}

async function pathsForListing(listingId) {
  const { data, error } = await supabase
    .from('listings')
    .select('photos')
    .eq('id', listingId)
    .single();
  if (error || !data) return [];
  const paths = new Set();
  for (const p of (data.photos || [])) {
    const full = extractStoragePath(p.url);
    const thumb = extractStoragePath(p.thumb_url);
    if (full) paths.add(full);
    if (thumb) paths.add(thumb);
  }
  return [...paths];
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== PadMagnet test-data wipe ===`);
  console.log(`Mode: ${LIVE ? '🔴 LIVE — destructive actions WILL execute' : '🟢 DRY RUN — no writes'}`);

  // Resolve full IDs from short prefixes (defends against typos in the
  // hardcoded short-ID list).
  console.log('\n[1/6] Resolving keep-list IDs...');
  const keepProfiles = [];
  for (const [email, label] of KEEP_PROFILE_EMAILS) {
    const id = await profileIdByEmail(email);
    keepProfiles.push({ id, email, label });
    console.log(`  ✓ ${email} → ${id.slice(0,8)}... (${label})`);
  }
  const keepListings = [];
  for (const [fullId, label] of KEEP_LISTING_IDS) {
    keepListings.push({ id: fullId, label });
    console.log(`  ✓ ${fullId.slice(0,8)}... → ${label}`);
  }
  const standaloneListingDeletes = [];
  for (const [fullId, label] of STANDALONE_LISTING_DELETES) {
    standaloneListingDeletes.push({ id: fullId, label });
    console.log(`  ✓ ${fullId.slice(0,8)}... → ${label}`);
  }

  // Verify each keeper profile is actually intact.
  console.log('\n[2/6] Pre-flight: verifying keepers...');
  for (const k of keepProfiles) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, archived_at')
      .eq('id', k.id)
      .single();
    if (error || !data) abort(`Keeper ${k.email} not found in profiles!`);
    if (data.archived_at) console.warn(`  ⚠️  ${k.email} is archived but still preserved`);
    console.log(`  ✓ ${k.email} (role=${data.role})`);
  }

  // Verify the keeper listing is intact + active.
  for (const k of keepListings) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, street_number, street_name, status, is_active, source, owner_user_id, public_remarks')
      .eq('id', k.id)
      .single();
    if (error || !data) abort(`Keeper listing ${k.label} not found!`);
    if (data.source !== 'owner') abort(`Keeper listing ${k.label} is source=${data.source}, expected owner`);
    if (data.status !== 'active' || !data.is_active) {
      console.warn(`  ⚠️  Keeper listing ${k.label} not active (status=${data.status}, is_active=${data.is_active})`);
    }
    const remarksLen = (data.public_remarks || '').length;
    if (remarksLen <= 120) {
      abort(`Keeper listing ${k.label} has public_remarks ${remarksLen} chars — must be >120 for "Read more" perf flow`);
    }
    console.log(`  ✓ ${data.street_number} ${data.street_name} (status=${data.status}, photos via FK, remarks=${remarksLen} chars)`);
  }

  // Compute delete sets.
  console.log('\n[3/6] Computing delete sets...');
  const keepIds = new Set(keepProfiles.map(k => k.id));
  const { data: allProfiles, error: allErr } = await supabase
    .from('profiles')
    .select('id, email, role, is_anonymous, stripe_customer_id, archived_at, created_at');
  if (allErr) abort(`profile scan: ${allErr.message}`);
  const toDelete = allProfiles.filter(p => !keepIds.has(p.id));

  const buckets = {
    namedConfirmed: [],   // hello@, application@, legal@, maintenance@, test@example
    maestroDomain:  [],   // *@test.padmagnet.com
    anon:           [],   // is_anonymous=true, no email
    other:          [],   // anything else (should be empty — surface for review)
  };
  const NAMED_CONFIRMED = new Set([
    'hello@padmagnet.com',
    'application@floridapm.net',
    'legal@padmagnet.com',
    'maintenance@floridapm.net',
    'test@example.com',
  ]);
  for (const p of toDelete) {
    if (p.is_anonymous && !p.email) buckets.anon.push(p);
    else if (p.email && p.email.endsWith('@test.padmagnet.com')) buckets.maestroDomain.push(p);
    else if (p.email && NAMED_CONFIRMED.has(p.email.toLowerCase())) buckets.namedConfirmed.push(p);
    else buckets.other.push(p);
  }

  const stripeCustomerIds = toDelete
    .filter(p => p.stripe_customer_id)
    .map(p => ({ profileId: p.id, email: p.email, stripeCustomerId: p.stripe_customer_id }));

  console.log(`  Total profiles: ${allProfiles.length}`);
  console.log(`  Keep:           ${keepIds.size}`);
  console.log(`  Delete:         ${toDelete.length}`);
  console.log(`    ├─ named (confirmed): ${buckets.namedConfirmed.length}`);
  buckets.namedConfirmed.forEach(p => console.log(`    │    · ${p.email}`));
  console.log(`    ├─ @test.padmagnet.com: ${buckets.maestroDomain.length}`);
  console.log(`    ├─ anonymous:           ${buckets.anon.length}`);
  console.log(`    └─ other (UNEXPECTED):  ${buckets.other.length}`);
  if (buckets.other.length > 0) {
    console.log(`\n  🚨 Unexpected named accounts in delete set — review before proceeding:`);
    buckets.other.forEach(p => console.log(`     ${p.id.slice(0,8)} | ${p.email} | role=${p.role} | created=${p.created_at?.slice(0,10)}`));
    if (LIVE) abort('Refusing to delete unexpected named accounts in LIVE mode. Add them to KEEP_PROFILE_IDS or NAMED_CONFIRMED.');
  }

  // Owner listings impact (MLS untouched).
  const { data: ownerListings, error: olErr } = await supabase
    .from('listings')
    .select('id, street_number, street_name, status, owner_user_id')
    .eq('source', 'owner');
  if (olErr) abort(`owner listings scan: ${olErr.message}`);
  const keepListingIds = new Set(keepListings.map(k => k.id));
  const ownerListingsToDelete = ownerListings.filter(l => !keepListingIds.has(l.id));
  console.log(`\n  Owner-source listings: ${ownerListings.length}`);
  console.log(`    ├─ keep:   ${keepListingIds.size}`);
  console.log(`    └─ delete: ${ownerListingsToDelete.length}`);
  ownerListingsToDelete.forEach(l => {
    const reason = standaloneListingDeletes.find(s => s.id === l.id)
      ? '(standalone — owner kept)'
      : '(owner being deleted)';
    console.log(`         · ${l.id.slice(0,8)} | ${l.street_number} ${l.street_name} ${reason}`);
  });

  // Storage objects.
  console.log('\n[4/6] Storage cleanup preview (listing-photos bucket)...');
  // Strategy: for owners being fully deleted, wipe their entire
  // {ownerId}/ prefix. For standalone listings (owner kept, listing
  // dropped), extract specific paths from the listing's photos JSON so
  // we don't touch the kept listing's photos sharing the same prefix.
  const fullOwnerWipes = new Set(
    ownerListingsToDelete
      .filter(l => !standaloneListingDeletes.find(s => s.id === l.id))
      .map(l => l.owner_user_id)
      .filter(id => !keepIds.has(id))
  );
  let totalStorageObjects = 0;
  for (const ownerId of fullOwnerWipes) {
    const { data: files } = await supabase.storage.from('listing-photos').list(ownerId);
    const n = files?.length || 0;
    if (n > 0) {
      totalStorageObjects += n;
      console.log(`  full-owner wipe ${ownerId.slice(0,8)} → ${n} files`);
    }
  }
  const standalonePathSets = new Map();
  for (const l of standaloneListingDeletes) {
    const paths = await pathsForListing(l.id);
    standalonePathSets.set(l.id, paths);
    totalStorageObjects += paths.length;
    console.log(`  standalone ${l.id.slice(0,8)} → ${paths.length} specific files (${l.label.split(' (')[0]})`);
  }
  console.log(`  Total storage objects to remove: ${totalStorageObjects}`);

  // Stripe.
  console.log('\n[5/6] Stripe orphan preview...');
  console.log(`  Profiles with stripe_customer_id (will orphan in Stripe — cosmetic only,`);
  console.log(`  NO recurring subs exist per code review): ${stripeCustomerIds.length}`);
  stripeCustomerIds.forEach(s => console.log(`    · ${s.email || '(anon)'} → ${s.stripeCustomerId}`));

  // Execute or stop.
  console.log('\n[6/6] Execution');
  if (!LIVE) {
    console.log('  🟢 Dry run complete. Re-run with WIPE_LIVE=1 to execute.');
    return;
  }

  console.log('  🔴 LIVE: starting destructive phase...\n');

  // Step A: standalone listing deletes (where owner is kept).
  // Delete the listing row + its specific photos (do photos first so we
  // don't lose the URL→path map by deleting the row).
  for (const l of standaloneListingDeletes) {
    const paths = standalonePathSets.get(l.id) || [];
    if (paths.length > 0) {
      const { error: stErr } = await supabase.storage.from('listing-photos').remove(paths);
      if (stErr) console.warn(`  ⚠️  storage remove for ${l.label}: ${stErr.message}`);
      else console.log(`  ✓ Removed ${paths.length} storage files for ${l.label.split(' (')[0]}`);
    }
    const { error } = await supabase.from('listings').delete().eq('id', l.id);
    if (error) throw new Error(`standalone listing ${l.id}: ${error.message}`);
    console.log(`  ✓ Deleted standalone listing: ${l.label}`);
  }

  // Step B: per-user cleanup + auth delete (in batches to avoid hammering).
  let userOk = 0, userFail = 0;
  const BATCH = 10;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(p => cleanupUser(p.id)));
    results.forEach((r, idx) => {
      const p = batch[idx];
      if (r.status === 'fulfilled') {
        userOk++;
      } else {
        userFail++;
        console.log(`  ✗ ${p.email || '(anon)'} ${p.id.slice(0,8)}: ${r.reason.message}`);
      }
    });
    if ((i + BATCH) % 50 === 0 || i + BATCH >= toDelete.length) {
      console.log(`  Progress: ${Math.min(i + BATCH, toDelete.length)}/${toDelete.length} (ok=${userOk} fail=${userFail})`);
    }
  }

  // Step C: storage cleanup for full-owner wipes (Tioga's photos already
  // handled in Step A as part of the standalone deletion).
  let storageOk = 0;
  for (const ownerId of fullOwnerWipes) {
    storageOk += await cleanupListingStorage(ownerId);
  }
  console.log(`\n  ✓ Full-owner storage objects removed: ${storageOk}`);

  // Step D: post-wipe verification.
  const { count: remainingProfiles } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true });
  const { count: remainingOwnerListings } = await supabase
    .from('listings').select('*', { count: 'exact', head: true }).eq('source', 'owner');
  const { count: mlsListings } = await supabase
    .from('listings').select('*', { count: 'exact', head: true }).eq('source', 'mls');

  console.log('\n=== Post-wipe verification ===');
  console.log(`  profiles remaining:        ${remainingProfiles} (expected ${keepIds.size})`);
  console.log(`  owner listings remaining:  ${remainingOwnerListings} (expected ${keepListingIds.size})`);
  console.log(`  MLS listings (untouched):  ${mlsListings}`);
  console.log(`  user deletions: ok=${userOk} fail=${userFail}`);

  if (remainingProfiles !== keepIds.size || remainingOwnerListings !== keepListingIds.size) {
    console.log('\n  ⚠️  Counts do not match expectations. Investigate.');
  } else {
    console.log('\n  ✅ Wipe complete. Counts match expectations.');
  }
}

main().catch(e => {
  console.error('\n❌ FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
