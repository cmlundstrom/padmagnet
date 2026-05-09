/**
 * DRAFT — DO NOT RUN WITHOUT CHRIS'S SIGN-OFF.
 *
 * Resets the Maverick ↔ Goose demo conversation back to the 5-message
 * baseline so each Maestro capture take starts from identical state.
 *
 * Run BEFORE every take:
 *   1. Deletes any messages newer than the 5 baseline ones (cleans up
 *      live sends + their webhook_logs links from prior takes)
 *   2. Re-times the 5 baseline messages to fresh offsets (NOW-2h ..
 *      NOW-1h) so on-screen timestamps always read "today, recent"
 *   3. Resets the conversations row metadata:
 *        last_message_text → 5th baseline message body
 *        last_message_at   → 5th baseline message new timestamp
 *        tenant_unread_count = owner_unread_count = 0
 *        tenant_last_read_at = owner_last_read_at = 5th baseline ts
 *
 * Identifies baseline vs live-send messages by (sender_id + body) tuple
 * match against the hardcoded BASELINE list. Anything not matching gets
 * deleted. Defense in depth: refuses to proceed if any baseline message
 * is missing (means initial seed was disrupted; need to re-run
 * setup-demo-chat-seed.mjs first).
 *
 * Default DRY RUN; RESET_LIVE=1 to execute.
 *
 * Schema verified 2026-05-08: messages.body (NOT content), webhook_logs
 * may reference message_id (NOT NULL CASCADE — must nullify before
 * deleting messages, mirrors scripts/wipe-test-data.mjs FK pattern).
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Constants (locked from setup-demo-chat-seed.mjs) ────────────────
const MAVERICK_UUID    = '49511c80-5f20-403e-ba68-dd5f5f14ad36';
const GOOSE_UUID       = 'e8b4b9fe-8c3a-4ac0-89bc-dd0efe3ef1ec';
const LISTING_UUID     = '66c0d40d-7aee-44f3-b959-7ba444db08ba';
const CONVERSATION_UUID = '46e258d5-3d54-43ae-84cc-629db0f00293';

// Baseline thread — order matters (idx 0 = oldest, idx 4 = newest).
// Body strings MUST match what setup-demo-chat-seed.mjs wrote.
const BASELINE = [
  { sender: GOOSE_UUID,    offsetMin: -120, body: "Hi! Just saw your Riverbend Cove listing — it looks beautiful. Any chance it's still available for a June move-in?" },
  { sender: MAVERICK_UUID, offsetMin: -105, body: "Hi! Thanks — yes, still available 🙂 Anything specific you want to know?" },
  { sender: GOOSE_UUID,    offsetMin: -90,  body: "Pets okay? We have two small dogs." },
  { sender: MAVERICK_UUID, offsetMin: -75,  body: "Absolutely — pets welcome. The fenced backyard is perfect for them and you've got the Indian River right out back." },
  { sender: GOOSE_UUID,    offsetMin: -60,  body: "Amazing. Going to chat with my partner tonight. Saving the listing!" },
];

const DRY_RUN = process.env.RESET_LIVE !== '1';

function bodyKey(senderId, body) {
  return `${senderId}::${body}`;
}

async function main() {
  console.log('\n=== Demo chat state reset ===');
  console.log(`Mode: ${DRY_RUN ? '🟢 DRY RUN — no writes' : '🔴 LIVE — destructive'}`);

  // Pull all messages in the conversation
  const { data: msgs, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', CONVERSATION_UUID)
    .order('created_at', { ascending: true });
  if (error) { console.error(`✗ messages scan: ${error.message}`); process.exit(1); }

  if (!msgs || msgs.length === 0) {
    console.error(`✗ Conversation ${CONVERSATION_UUID} has zero messages. Run setup-demo-chat-seed.mjs first.`);
    process.exit(1);
  }

  // Bucket: baseline vs live-send
  const baselineKeys = new Set(BASELINE.map(b => bodyKey(b.sender, b.body)));
  const baselineMatches = new Map(); // key → message row
  const liveSends = [];
  for (const m of msgs) {
    const k = bodyKey(m.sender_id, m.body);
    if (baselineKeys.has(k) && !baselineMatches.has(k)) {
      baselineMatches.set(k, m);
    } else {
      liveSends.push(m);
    }
  }

  console.log(`\n[scan] ${msgs.length} total messages in conversation`);
  console.log(`        ${baselineMatches.size}/5 baseline matched`);
  console.log(`        ${liveSends.length} live-send remnants from prior takes`);

  // Refuse if baseline incomplete
  if (baselineMatches.size !== BASELINE.length) {
    console.error(`\n🚨 Refusing to proceed — only ${baselineMatches.size}/5 baseline messages found.`);
    console.error(`   Re-run scripts/setup-demo-chat-seed.mjs to restore the seed.`);
    process.exit(1);
  }

  // Compute new timestamps for the 5 baseline messages
  const NOW = Date.now();
  const MIN = 60 * 1000;
  const newTimestamps = BASELINE.map(b => new Date(NOW + b.offsetMin * MIN).toISOString());

  // Preview
  console.log(`\n[preview] Re-timing 5 baseline messages to:`);
  BASELINE.forEach((b, i) => {
    const m = baselineMatches.get(bodyKey(b.sender, b.body));
    const who = b.sender === GOOSE_UUID ? 'Goose ' : 'Maverick';
    const oldTs = m.created_at?.slice(11, 16);
    const newTs = newTimestamps[i].slice(11, 16);
    console.log(`            [${oldTs}Z → ${newTs}Z] ${who}: ${b.body.slice(0, 60)}…`);
  });

  if (liveSends.length > 0) {
    console.log(`\n[preview] Deleting ${liveSends.length} live-send remnants:`);
    for (const m of liveSends) {
      const who = m.sender_id === GOOSE_UUID ? 'Goose '
                : m.sender_id === MAVERICK_UUID ? 'Maverick'
                : '???    ';
      console.log(`            [${m.created_at?.slice(11, 16)}Z] ${who}: ${(m.body || '').slice(0, 60)}…`);
    }
  }

  console.log(`\n[preview] Reset conversation row:`);
  console.log(`            last_message_text → "${BASELINE[4].body.slice(0, 60)}…"`);
  console.log(`            last_message_at   → ${newTimestamps[4]}`);
  console.log(`            tenant_unread_count = owner_unread_count = 0`);
  console.log(`            tenant_last_read_at = owner_last_read_at = ${newTimestamps[4]}`);

  if (DRY_RUN) {
    console.log(`\n🟢 DRY RUN complete. Re-run with RESET_LIVE=1 to execute.`);
    return;
  }

  // ── LIVE writes ─────────────────────────────────────────────────────

  // [1] Nullify webhook_logs.message_id for live-send messages, then delete them.
  if (liveSends.length > 0) {
    console.log(`\n[1/3] Cleaning up ${liveSends.length} live-send remnants...`);
    const liveSendIds = liveSends.map(m => m.id);

    const { error: whErr } = await supabase
      .from('webhook_logs')
      .update({ message_id: null })
      .in('message_id', liveSendIds);
    if (whErr) { console.error(`✗ webhook_logs nullify: ${whErr.message}`); process.exit(1); }

    const { error: delErr } = await supabase
      .from('messages')
      .delete()
      .in('id', liveSendIds);
    if (delErr) { console.error(`✗ messages delete: ${delErr.message}`); process.exit(1); }
    console.log(`✓ Live-send remnants removed`);
  } else {
    console.log(`\n[1/3] No live-send remnants — skipping cleanup.`);
  }

  // [2] Re-time the 5 baseline messages.
  console.log(`\n[2/3] Re-timing 5 baseline messages...`);
  for (let i = 0; i < BASELINE.length; i++) {
    const b = BASELINE[i];
    const m = baselineMatches.get(bodyKey(b.sender, b.body));
    const { error: upErr } = await supabase
      .from('messages')
      .update({ created_at: newTimestamps[i] })
      .eq('id', m.id);
    if (upErr) { console.error(`✗ message ${i + 1} update: ${upErr.message}`); process.exit(1); }
  }
  console.log(`✓ All 5 baseline timestamps refreshed`);

  // [3] Reset conversation row metadata.
  console.log(`\n[3/3] Resetting conversation row...`);
  const { error: convErr } = await supabase
    .from('conversations')
    .update({
      last_message_text: BASELINE[4].body,
      last_message_at: newTimestamps[4],
      tenant_unread_count: 0,
      owner_unread_count: 0,
      tenant_last_read_at: newTimestamps[4],
      owner_last_read_at: newTimestamps[4],
    })
    .eq('id', CONVERSATION_UUID);
  if (convErr) { console.error(`✗ conversation reset: ${convErr.message}`); process.exit(1); }
  console.log(`✓ Conversation metadata reset`);

  console.log(`\n✅ Demo state reset. Ready for next take.`);
}

main().catch(e => {
  console.error('\n❌ FATAL:', e.message);
  process.exit(1);
});
