// Seeds a full internal-owner conversation between two already-seeded users
// so a Maestro flow can deep-link into /conversation/<id> and exercise the
// sender-label rendering code in MessageBubble + conversation/[id].js.
//
// Requires:
//   - output.seed.renter = { userId, email, ... }   (from seed_test_renter.js)
//   - output.seed.owner  = { userId, email, ... }   (from seed_test_owner.js)
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
//
// display_name: the handle_new_user trigger (migration 032) populates
// profiles.display_name from raw_user_meta_data.display_name OR, if absent,
// from split_part(email, '@', 1). The existing seed helpers don't pass
// display_name in metadata, so we derive it from the email prefix here.
// That's fine for testing the label rendering — the name just happens to
// be "maestro-renter-<timestamp>" rather than "Alice Smith".
//
// Exposes:
//   output.seed.conversation = {
//     conversationId,
//     ownerDisplayName,     // matches profiles.display_name from trigger
//     renterDisplayName,
//     deepLink,             // exp+padmagnet://conversation/<id>
//   }

if (!output.seed || !output.seed.renter || !output.seed.owner) {
  throw new Error('seed_test_conversation requires output.seed.renter + output.seed.owner');
}

const renterUserId = output.seed.renter.userId;
const ownerUserId = output.seed.owner.userId;

// Derive display_name the same way the trigger does when metadata is absent.
const renterDisplayName = output.seed.renter.email.split('@')[0];
const ownerDisplayName = output.seed.owner.email.split('@')[0];

const headers = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
};

// Create conversation. listing_id is nullable in the schema, so we skip
// seeding a listing — owner_display_name resolves via a profiles JOIN in
// the /api/conversations GET handler, not via listing ownership.
const convResp = http.post(
  SUPABASE_URL + '/rest/v1/conversations',
  {
    headers: Object.assign({}, headers, { 'Prefer': 'return=representation' }),
    body: JSON.stringify({
      tenant_user_id: renterUserId,
      owner_user_id: ownerUserId,
      conversation_type: 'internal_owner',
      listing_address: 'Maestro Test Address, Test City, FL',
      last_message_text: 'Welcome to the test conversation',
      last_message_at: new Date().toISOString(),
      tenant_unread_count: 1,
      owner_unread_count: 0,
    }),
  }
);

if (!convResp.ok) {
  throw new Error('Conversation seed failed: HTTP ' + convResp.status + ' — ' + convResp.body);
}

const convo = json(convResp.body)[0];
const conversationId = convo.id;

// Message 1 (from owner → renter). The renter is the viewer in our test,
// so this is the incoming message whose sender label we'll assert on.
const now = Date.now();
const msg1 = http.post(
  SUPABASE_URL + '/rest/v1/messages',
  {
    headers: headers,
    body: JSON.stringify({
      conversation_id: conversationId,
      sender_id: ownerUserId,
      body: 'Hi! The unit is still available — would you like to schedule a tour?',
      channel: 'in_app',
      delivery_status: 'delivered',
      created_at: new Date(now - 300000).toISOString(),
    }),
  }
);
if (!msg1.ok) throw new Error('Msg1 seed failed: HTTP ' + msg1.status + ' — ' + msg1.body);

// Message 2 (from renter → owner). Renders as a right-aligned "mine"
// bubble with no sender label (that's the control: label must NOT show).
const msg2 = http.post(
  SUPABASE_URL + '/rest/v1/messages',
  {
    headers: headers,
    body: JSON.stringify({
      conversation_id: conversationId,
      sender_id: renterUserId,
      body: 'Yes, Thursday at 4pm works for me.',
      channel: 'in_app',
      delivery_status: 'delivered',
      created_at: new Date(now - 60000).toISOString(),
    }),
  }
);
if (!msg2.ok) throw new Error('Msg2 seed failed: HTTP ' + msg2.status + ' — ' + msg2.body);

output.seed.conversation = {
  conversationId: conversationId,
  ownerDisplayName: ownerDisplayName,
  renterDisplayName: renterDisplayName,
  deepLink: 'exp+padmagnet://conversation/' + conversationId,
};
