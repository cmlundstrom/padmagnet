// Maestro test-fixture cleanup.
//
// Default scope: profiles where email matches the Maestro throwaway pattern
// (`%@test.padmagnet.com`). Designed to run after each Maestro batch to
// remove zombies from aborted/failed flows whose own cleanup helpers
// didn't fire.
//
// Optional scope (WIPE_ANON=1): also deletes anonymous profiles
// (is_anonymous=true). Useful pre-launch when the batch's UI flows have
// created many `signInAnonymously()` sessions from welcome CTA taps. Off
// by default because in production, anon profiles are real users (people
// swiping without signing up) — never delete those blindly.
//
// NOTE: anon profile emails are stored as empty string '', not NULL — the
// is_anonymous flag is the canonical discriminator, not the email.
//
// Default mode: DRY_RUN (no destructive action). Set MAESTRO_CLEAN=1 to
// execute. Both flags can be combined.
//
// Usage:
//   node scripts/cleanup-maestro-fixtures.mjs                          # dry run, named only
//   MAESTRO_CLEAN=1 node scripts/cleanup-maestro-fixtures.mjs          # live, named only
//   WIPE_ANON=1 node scripts/cleanup-maestro-fixtures.mjs              # dry run with anon preview
//   MAESTRO_CLEAN=1 WIPE_ANON=1 node scripts/cleanup-maestro-fixtures.mjs # live, named + anon
//
// Safety:
//   - Named scope: ONLY touches profiles with email ending in @test.padmagnet.com
//   - Anon scope: ONLY touches profiles where is_anonymous=true
//   - Refuses to run if a kept-fixture email accidentally matches the maestro
//     pattern (defensive — should never happen)
//   - Mirrors FK-aware deletion pattern from scripts/wipe-test-data.mjs
//     (4 FK gaps surfaced in the 2026-05-06 surgical wipe)

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const LIVE = process.env.MAESTRO_CLEAN === '1';
const WIPE_ANON = process.env.WIPE_ANON === '1';
const MAESTRO_DOMAIN = '@test.padmagnet.com';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Defensive: emails on this list are NEVER deleted, even if they somehow
// matched the maestro domain pattern. None should actually match — but
// defense in depth.
const NEVER_DELETE_EMAILS = new Set([
  'cmlundstrom@gmail.com',
  'test@padmagnet.com',
  'privacy@padmagnet.com',
  'support@padmagnet.com',
  'poppylundstrom@gmail.com',
  'info@floridapm.net',
]);

// FK-aware per-user cleanup. Mirrors scripts/wipe-test-data.mjs and
// app/api/admin/users/route.js resetUser(). Pre-steps sever NOT-CASCADE
// FKs in webhook_logs + phone_mappings before the cleanupSteps loop runs.
async function cleanupUser(userId) {
  const summary = {};

  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`tenant_user_id.eq.${userId},owner_user_id.eq.${userId}`);
  if (convs && convs.length > 0) {
    const convIds = convs.map(c => c.id);
    await supabase.from('webhook_logs').update({ conversation_id: null }).in('conversation_id', convIds);
    await supabase.from('phone_mappings').delete().in('conversation_id', convIds);
    const { data: convMsgs } = await supabase.from('messages').select('id').in('conversation_id', convIds);
    if (convMsgs && convMsgs.length > 0) {
      const msgIds = convMsgs.map(m => m.id);
      await supabase.from('webhook_logs').update({ message_id: null }).in('message_id', msgIds);
    }
  }

  const cleanupSteps = [
    { table: 'phone_mappings', filters: [['user_id', userId]] },
    { table: 'messages',       filters: [['sender_id', userId], ['recipient_id', userId]] },
    { table: 'conversations',  filters: [['tenant_user_id', userId], ['owner_user_id', userId]] },
    { table: 'showing_requests', filters: [['tenant_user_id', userId]] },
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

  for (const step of cleanupSteps) {
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

async function deleteBatch(targets, label) {
  let ok = 0, fail = 0;
  const BATCH = 10;
  for (let i = 0; i < targets.length; i += BATCH) {
    const slice = targets.slice(i, i + BATCH);
    const results = await Promise.allSettled(slice.map(t => cleanupUser(t.id)));
    results.forEach((r, idx) => {
      const t = slice[idx];
      if (r.status === 'fulfilled') ok++;
      else { fail++; console.log(`  ✗ [${label}] ${t.email || '(anon)'} ${t.id.slice(0,8)}: ${r.reason.message}`); }
    });
  }
  return { ok, fail };
}

async function main() {
  console.log(`\n=== Maestro fixture cleanup ===`);
  console.log(`Mode: ${LIVE ? '🔴 LIVE — destructive' : '🟢 DRY RUN — no writes'}`);
  console.log(`Named filter: email ILIKE '%${MAESTRO_DOMAIN}'`);
  if (WIPE_ANON) console.log(`Anon filter:  is_anonymous=true  (WIPE_ANON=1 set)`);

  // Pull all maestro-domain (named) profiles.
  const { data: named, error: namedErr } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .ilike('email', `%${MAESTRO_DOMAIN}`)
    .order('created_at', { ascending: true });
  if (namedErr) { console.error('named scan:', namedErr.message); process.exit(1); }

  // Always fetch anon counts so the user sees what's there even without
  // WIPE_ANON. Only DELETE them if WIPE_ANON=1 + LIVE.
  // Note: anon profiles have email='' (empty string) not NULL — discovered
  // 2026-05-07 when the .is('email', null) filter returned 0 despite the
  // DB containing 19 anons. is_anonymous=true is the canonical flag.
  const { data: anons, error: anonErr } = await supabase
    .from('profiles')
    .select('id, email, role, is_anonymous, created_at')
    .eq('is_anonymous', true)
    .order('created_at', { ascending: true });
  if (anonErr) { console.error('anon scan:', anonErr.message); process.exit(1); }

  // Defensive check: refuse to proceed if any kept-email matched the
  // maestro pattern (should never happen — pure defense in depth).
  const collisions = (named || []).filter(t => NEVER_DELETE_EMAILS.has((t.email || '').toLowerCase()));
  if (collisions.length > 0) {
    console.error(`\n🚨 Refusing to proceed — kept-fixture emails matched maestro pattern:`);
    collisions.forEach(c => console.error(`  ${c.email}`));
    process.exit(1);
  }

  // Reporting — grouped buckets for named, single count for anon.
  const buckets = {};
  for (const t of (named || [])) {
    const local = (t.email || '').split('@')[0];
    const prefix = local.replace(/-?\d{10,}$/, '').replace(/-?\d+$/, '') || local;
    buckets[prefix] = (buckets[prefix] || 0) + 1;
  }

  console.log(`\nNamed maestro fixtures: ${named?.length || 0}`);
  Object.entries(buckets).sort(([,a],[,b]) => b - a).forEach(([prefix, count]) => {
    console.log(`  ${prefix.padEnd(30)} ${count}`);
  });
  if (named && named.length > 0 && named.length <= 10) {
    named.forEach(t => console.log(`    · ${t.id.slice(0,8)} | ${t.email} | ${t.created_at?.slice(0,10)}`));
  }

  console.log(`\nAnonymous profiles:     ${anons?.length || 0}`);
  if (anons && anons.length > 0) {
    const oldest = anons[0]?.created_at?.slice(0, 16);
    const newest = anons[anons.length - 1]?.created_at?.slice(0, 16);
    console.log(`    span: ${oldest} → ${newest}`);
    if (!WIPE_ANON) {
      console.log(`    (set WIPE_ANON=1 to include in cleanup)`);
    }
  }

  const totalToDelete = (named?.length || 0) + (WIPE_ANON ? (anons?.length || 0) : 0);

  if (!LIVE) {
    console.log(`\n🟢 Dry run complete. Re-run with MAESTRO_CLEAN=1${WIPE_ANON ? ' WIPE_ANON=1' : ''} to delete ${totalToDelete} profile(s).`);
    return;
  }

  if (totalToDelete === 0) {
    console.log(`\n✅ Nothing to clean.`);
    return;
  }

  console.log(`\n🔴 LIVE: starting destructive phase...\n`);

  let totalOk = 0, totalFail = 0;
  if (named && named.length > 0) {
    const r = await deleteBatch(named, 'named');
    console.log(`  named: ok=${r.ok} fail=${r.fail}`);
    totalOk += r.ok; totalFail += r.fail;
  }
  if (WIPE_ANON && anons && anons.length > 0) {
    const r = await deleteBatch(anons, 'anon');
    console.log(`  anon:  ok=${r.ok} fail=${r.fail}`);
    totalOk += r.ok; totalFail += r.fail;
  }

  // Verify post-cleanup counts.
  const { count: remainingNamed } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true })
    .ilike('email', `%${MAESTRO_DOMAIN}`);
  const { count: remainingAnon } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true })
    .eq('is_anonymous', true);

  console.log(`\n=== Done — ok=${totalOk} fail=${totalFail} ===`);
  console.log(`  Named maestro fixtures remaining: ${remainingNamed}`);
  console.log(`  Anonymous profiles remaining:     ${remainingAnon}${WIPE_ANON ? ' (expected 0)' : ' (not wiped — WIPE_ANON not set)'}`);
  if (remainingNamed > 0 || (WIPE_ANON && remainingAnon > 0)) {
    console.log(`  ⚠️  Some targets still present. Investigate failures above.`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n❌ FATAL:', e.message);
  process.exit(1);
});
