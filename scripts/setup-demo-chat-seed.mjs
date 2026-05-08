/**
 * DRAFT — DO NOT RUN WITHOUT CHRIS'S SIGN-OFF.
 *
 * Sets up the full demo-chat surface for the Google Play promo video:
 *   1. Set preferred_channel on both fixtures (Maverick='email',
 *      Goose='sms') so during the LIVE on-camera sends, the unified
 *      comms layer routes Goose's outbound to Maverick via Resend
 *      (email lands in hello@padmagnet.com inbox), and Maverick's
 *      outbound to Goose via Twilio (SMS lands on Chris's S10 phone).
 *   2. Insert 1 conversation + 5 in_app messages (~2-hour spread) so
 *      the chat thread auto-scrolls during 0:11–0:18 of the shot list.
 *   3. Insert 1 swipes row (direction='right') so the demo listing
 *      appears in Goose's "Saved" tab during the video.
 *
 * The 2 LIVE sends during recording (0:18–0:26 + 0:26–0:34) are NOT
 * part of this seed — they're typed on camera so the email→SMS
 * conversion is observable end-to-end.
 *
 * Idempotent across all three concerns: re-running detects existing
 * preferred_channel/conversation/swipe and only fills in what's missing.
 *
 * Schema verified 2026-05-08:
 *   profiles.preferred_channel: text default='sms' (allowed: in_app/email/sms)
 *   conversations: tenant_user_id, owner_user_id, listing_id,
 *                  listing_address, listing_photo_url,
 *                  last_message_text, last_message_at,
 *                  conversation_type='internal_owner',
 *                  primary_channel='in_app',
 *                  tenant_unread_count, owner_unread_count
 *   messages: conversation_id, sender_id, body (NOT content),
 *             channel='in_app', delivery_status, created_at, read
 *   swipes: user_id, listing_id, direction ('right' or 'left'), padscore
 *   (PadMagnet has NO separate saves/tenant_saves table — right-swipe = save)
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Identities (locked from prior memory + setup scripts) ────────────
const MAVERICK_UUID  = '49511c80-5f20-403e-ba68-dd5f5f14ad36'; // owner
const GOOSE_UUID     = 'e8b4b9fe-8c3a-4ac0-89bc-dd0efe3ef1ec'; // renter
const LISTING_UUID   = '66c0d40d-7aee-44f3-b959-7ba444db08ba'; // 1827 Riverbend Cove
const LISTING_ADDR   = '1827 Riverbend Cove, Sewall\'s Point, FL 34996';

// ── Message thread (Goose initiates, Maverick warm replies) ─────────
// All timestamps are RELATIVE to the moment the script runs. This keeps
// the conversation "fresh" no matter when we record. Newest message is
// the last one in this array.
const NOW = Date.now();
const MIN = 60 * 1000;
const MESSAGES = [
  // T-2h: Goose initial inquiry
  {
    sender: GOOSE_UUID,
    offset: -120 * MIN,
    body: "Hi! Just saw your Riverbend Cove listing — it looks beautiful. Any chance it's still available for a June move-in?",
  },
  // T-1h45m: Maverick warm reply
  {
    sender: MAVERICK_UUID,
    offset: -105 * MIN,
    body: "Hi! Thanks — yes, still available 🙂 Anything specific you want to know?",
  },
  // T-1h30m: Goose narrowing question
  {
    sender: GOOSE_UUID,
    offset: -90 * MIN,
    body: "Pets okay? We have two small dogs.",
  },
  // T-1h15m: Maverick affirmative + property color
  {
    sender: MAVERICK_UUID,
    offset: -75 * MIN,
    body: "Absolutely — pets welcome. The fenced backyard is perfect for them and you've got the Indian River right out back.",
  },
  // T-1h: Goose closing for now (sets up the live send below)
  {
    sender: GOOSE_UUID,
    offset: -60 * MIN,
    body: "Amazing. Going to chat with my partner tonight. Saving the listing!",
  },
];

// During recording, two LIVE sends will extend this thread:
//   T+0:00  Goose:    "Is it still available?"           ← typed on camera
//   T+0:30  Maverick: "Yes! Come tour Saturday?"         ← typed on camera
// Live sends are NOT seeded here.

const DRY_RUN = process.env.SEED_LIVE !== '1';

async function main() {
  console.log('\n=== Demo chat seed ===');
  console.log(`Mode:    ${DRY_RUN ? '🟢 DRY RUN — no writes' : '🔴 LIVE — destructive'}`);
  console.log(`Renter:  Goose (${GOOSE_UUID})`);
  console.log(`Owner:   Maverick (${MAVERICK_UUID})`);
  console.log(`Listing: ${LISTING_ADDR} (${LISTING_UUID})`);

  // Verify all three rows exist before proceeding (defense in depth).
  const checks = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, role').eq('id', MAVERICK_UUID).maybeSingle(),
    supabase.from('profiles').select('id, email, display_name, role').eq('id', GOOSE_UUID).maybeSingle(),
    supabase.from('listings').select('id, is_demo, status, photos, owner_user_id').eq('id', LISTING_UUID).maybeSingle(),
  ]);
  const [maverick, goose, listing] = checks.map(c => c.data);
  if (!maverick) { console.error('✗ Maverick profile not found'); process.exit(1); }
  if (!goose) { console.error('✗ Goose profile not found'); process.exit(1); }
  if (!listing) { console.error('✗ Demo listing not found'); process.exit(1); }
  if (listing.owner_user_id !== MAVERICK_UUID) { console.error('✗ Listing owner mismatch'); process.exit(1); }
  if (!listing.is_demo) { console.error('⚠️  Listing is_demo=false — this is the wrong listing!'); process.exit(1); }
  console.log(`✓ All identities verified (Goose ${goose.role}, Maverick ${maverick.role}, listing is_demo=${listing.is_demo})`);

  // Idempotency: detect what's already in place across the 3 concerns.
  const [convCheck, swipeCheck] = await Promise.all([
    supabase.from('conversations')
      .select('id, last_message_at, last_message_text')
      .eq('listing_id', LISTING_UUID)
      .eq('tenant_user_id', GOOSE_UUID)
      .eq('owner_user_id', MAVERICK_UUID)
      .maybeSingle(),
    supabase.from('swipes')
      .select('id, direction, created_at')
      .eq('user_id', GOOSE_UUID)
      .eq('listing_id', LISTING_UUID)
      .maybeSingle(),
  ]);
  const existingConv = convCheck.data;
  const existingSwipe = swipeCheck.data;

  // Preview — print the planned changes for review.
  console.log('\n--- Planned changes ---');

  // 1. Channel preferences
  console.log('\n[1] Channel preferences:');
  console.log(`    Maverick.preferred_channel → 'email'  (current: ${maverick.preferred_channel || '(default)'})`);
  console.log(`    Goose.preferred_channel    → 'sms'    (current: ${goose.preferred_channel || '(default)'})`);

  // 2. Conversation + 5 messages
  console.log('\n[2] Conversation + 5 in_app messages, ~2h time spread:');
  if (existingConv) {
    console.log(`    SKIP — conversation already exists: ${existingConv.id}`);
    console.log(`    Last msg: "${existingConv.last_message_text?.slice(0, 60)}..." at ${existingConv.last_message_at}`);
  } else {
    for (const m of MESSAGES) {
      const ts = new Date(NOW + m.offset).toISOString().slice(11, 16);
      const who = m.sender === GOOSE_UUID ? 'Goose ' : 'Maverick';
      console.log(`    [${ts}Z] ${who}: ${m.body}`);
    }
  }

  // 3. Saved listing (right-swipe)
  console.log('\n[3] Goose saves the listing (swipes row, direction=right):');
  if (existingSwipe) {
    console.log(`    SKIP — swipe already exists (direction='${existingSwipe.direction}', at ${existingSwipe.created_at})`);
  } else {
    console.log(`    INSERT swipes(user_id=Goose, listing_id=${LISTING_UUID.slice(0,8)}, direction='right')`);
  }

  console.log('\n--- End preview ---');

  if (DRY_RUN) {
    console.log('\n🟢 DRY RUN complete. Re-run with SEED_LIVE=1 to write to DB.');
    return;
  }

  // ── LIVE writes ─────────────────────────────────────────────────────

  // [1] Update preferred_channel for both fixtures.
  console.log('\n[1/3] Updating preferred_channel...');
  const { error: mavErr } = await supabase
    .from('profiles')
    .update({ preferred_channel: 'email' })
    .eq('id', MAVERICK_UUID);
  if (mavErr) { console.error(`✗ Maverick update: ${mavErr.message}`); process.exit(1); }

  const { error: gooseErr } = await supabase
    .from('profiles')
    .update({ preferred_channel: 'sms' })
    .eq('id', GOOSE_UUID);
  if (gooseErr) { console.error(`✗ Goose update: ${gooseErr.message}`); process.exit(1); }
  console.log('✓ Maverick=email, Goose=sms');

  // [2] Insert conversation + 5 messages (skip if exists).
  if (existingConv) {
    console.log(`\n[2/3] Conversation already exists (${existingConv.id}) — skipping insert.`);
  } else {
    console.log('\n[2/3] Inserting conversation + 5 messages...');
    const heroPhotoUrl = listing.photos?.[0]?.url || null;
    const lastMsg = MESSAGES[MESSAGES.length - 1];
    const lastMsgAt = new Date(NOW + lastMsg.offset).toISOString();

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        tenant_user_id: GOOSE_UUID,
        owner_user_id: MAVERICK_UUID,
        listing_id: LISTING_UUID,
        listing_address: LISTING_ADDR,
        listing_photo_url: heroPhotoUrl,
        last_message_text: lastMsg.body,
        last_message_at: lastMsgAt,
        tenant_unread_count: 0,
        owner_unread_count: 0,
        status: 'active',
        conversation_type: 'internal_owner',
        primary_channel: 'in_app',
        tenant_last_read_at: lastMsgAt,
        owner_last_read_at: lastMsgAt,
      })
      .select('id')
      .single();
    if (convErr) { console.error(`✗ Conversation insert: ${convErr.message}`); process.exit(1); }

    const messageRows = MESSAGES.map(m => ({
      conversation_id: conv.id,
      sender_id: m.sender,
      body: m.body,
      channel: 'in_app',
      delivery_status: 'delivered',
      read: true,
      created_at: new Date(NOW + m.offset).toISOString(),
    }));
    const { error: msgErr } = await supabase.from('messages').insert(messageRows);
    if (msgErr) { console.error(`✗ Message insert: ${msgErr.message}`); process.exit(1); }
    console.log(`✓ Conversation ${conv.id} + 5 messages`);
  }

  // [3] Insert saved-listing swipe (skip if exists).
  if (existingSwipe) {
    console.log(`\n[3/3] Swipe already exists — skipping.`);
  } else {
    console.log('\n[3/3] Inserting saved-listing swipe...');
    const { error: swipeErr } = await supabase
      .from('swipes')
      .insert({
        user_id: GOOSE_UUID,
        listing_id: LISTING_UUID,
        direction: 'right',
      });
    if (swipeErr) { console.error(`✗ Swipe insert: ${swipeErr.message}`); process.exit(1); }
    console.log('✓ Demo listing now appears in Goose\'s Saved tab');
  }

  console.log('\n✅ Demo chat surface ready end-to-end:');
  console.log('   - Maverick(email) ↔ Goose(sms) channel routing wired for live sends');
  console.log('   - 5-message thread visible in both apps');
  console.log('   - Listing appears in Goose\'s Saved tab');
}

main().catch(e => {
  console.error('\n❌ FATAL:', e.message);
  process.exit(1);
});
