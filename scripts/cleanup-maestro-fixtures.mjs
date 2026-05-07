// Maestro test-fixture cleanup.
//
// Deletes all profiles where email matches the Maestro throwaway pattern
// (`%@test.padmagnet.com`). Designed to run after each Maestro batch to
// remove any zombies from aborted/failed flows whose own cleanup helpers
// didn't fire.
//
// Default mode: DRY_RUN (no destructive action). Set MAESTRO_CLEAN=1 to
// execute.
//
// Usage:
//   node scripts/cleanup-maestro-fixtures.mjs                # dry run
//   MAESTRO_CLEAN=1 node scripts/cleanup-maestro-fixtures.mjs # live
//
// Safety:
//   - ONLY touches profiles with email ending in @test.padmagnet.com
//   - Refuses to run if a kept-fixture email accidentally matches that
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

async function main() {
  console.log(`\n=== Maestro fixture cleanup ===`);
  console.log(`Mode: ${LIVE ? '🔴 LIVE — destructive' : '🟢 DRY RUN — no writes'}`);
  console.log(`Filter: email ILIKE '%${MAESTRO_DOMAIN}'`);

  // Pull all maestro-domain profiles.
  const { data: targets, error } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .ilike('email', `%${MAESTRO_DOMAIN}`)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('profile scan:', error.message);
    process.exit(1);
  }

  if (!targets || targets.length === 0) {
    console.log('\n✅ No maestro fixtures found. Nothing to clean.');
    return;
  }

  // Defensive check: refuse to delete any never-delete email.
  const collisions = targets.filter(t => NEVER_DELETE_EMAILS.has((t.email || '').toLowerCase()));
  if (collisions.length > 0) {
    console.error(`\n🚨 Refusing to proceed — kept-fixture emails matched maestro pattern:`);
    collisions.forEach(c => console.error(`  ${c.email}`));
    process.exit(1);
  }

  // Group by sub-pattern for the summary.
  const buckets = {};
  for (const t of targets) {
    const local = (t.email || '').split('@')[0];
    const prefix = local.replace(/-?\d{10,}$/, '').replace(/-?\d+$/, '') || local; // strip trailing timestamps
    buckets[prefix] = (buckets[prefix] || 0) + 1;
  }

  console.log(`\nFound ${targets.length} maestro fixture(s):`);
  Object.entries(buckets).sort(([,a],[,b]) => b - a).forEach(([prefix, count]) => {
    console.log(`  ${prefix.padEnd(30)} ${count}`);
  });

  if (targets.length <= 10) {
    console.log('\nFull list:');
    targets.forEach(t => console.log(`  ${t.id.slice(0,8)} | ${t.email} | role=${t.role} | created=${t.created_at?.slice(0,10)}`));
  }

  if (!LIVE) {
    console.log(`\n🟢 Dry run complete. Re-run with MAESTRO_CLEAN=1 to delete ${targets.length} profile(s).`);
    return;
  }

  console.log(`\n🔴 LIVE: starting destructive phase...\n`);

  let ok = 0, fail = 0;
  const BATCH = 10;
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(t => cleanupUser(t.id)));
    results.forEach((r, idx) => {
      const t = batch[idx];
      if (r.status === 'fulfilled') ok++;
      else { fail++; console.log(`  ✗ ${t.email} ${t.id.slice(0,8)}: ${r.reason.message}`); }
    });
  }

  // Verify post-cleanup count.
  const { count: remaining } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .ilike('email', `%${MAESTRO_DOMAIN}`);

  console.log(`\n=== Done — ok=${ok} fail=${fail}, remaining maestro fixtures: ${remaining} ===`);
  if (remaining > 0) {
    console.log(`  ⚠️  ${remaining} fixture(s) still present. Investigate failures above.`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n❌ FATAL:', e.message);
  process.exit(1);
});
