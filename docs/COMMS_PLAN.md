# PadMagnet Unified Communications Plan

**Date:** April 7, 2026
**Status:** APPROVED — ready to build

---

## Section 1: High-Level Architecture

### Decision: Enhance Current System (Do NOT Migrate to Twilio Conversations)

Your custom system (migration 038) already provides:
- `conversations` + `messages` tables with multi-channel fields
- `phone_mappings` for inbound SMS routing
- `message_delivery_queue` with exponential backoff retry
- Inbound webhooks for Twilio SMS and Resend email (signature validation, dedup)
- Read receipts with per-user cursors
- External agent support (MLS agents via email reply-to threading)
- Supabase Realtime for live message delivery

Twilio Conversations API would add $0.05/active conversation/month + $0.0008/message for capabilities you already have. Not worth the cost or migration risk.

### Channel Routing Rules

| Listing Source | Recipient | Notification Channel | Reply Channel |
|---|---|---|---|
| `owner` (PadMagnet user) | In-app user | Per user preference (push + email or SMS) | In-app, email, or SMS |
| `mls` (Bridge Interactive + future IDX providers) | External agent | **Email only** | **Email only** (via `conv-{uuid}@inbound.padmagnet.com`) |

**Why email-only for MLS agents:**
- Each conversation has a unique reply-to address — no routing collisions
- Same agent with 20 listings = 20 separate, correctly-threaded email conversations
- SMS from an unknown number looks like spam to agents; professional email with listing photo builds trust
- Full audit trail via Resend delivery confirmation
- No Twilio SMS cost for agent notifications
- Eliminates the `phone_mappings` collision problem (UNIQUE constraint on `twilio_number, user_phone`)

### Cost Estimate (Monthly, at Scale)

| Item | Cost |
|---|---|
| Twilio phone number | ~$1.15/mo |
| Twilio SMS (owner ↔ renter, A2P) | ~$0.0079/segment × volume |
| Resend email (agent notifications + replies) | Included in existing plan |
| Supabase Realtime | Included in Pro plan |
| **Twilio Conversations API** | **$0 (not using)** |

At 200 active renter↔owner conversations with SMS, ~5 SMS each: ~$8-15/mo in SMS segments.
Agent conversations via email: $0 incremental (Resend plan quota).

---

## Section 2: User Flows

### Flow 1: Renter Messages a PadMagnet Owner (Internal)

```
RENTER (mobile app)                        SYSTEM                              OWNER (PadMagnet user)
───────────────────                        ──────                              ──────────────────────
1. Taps "Message Owner"
   on owner listing card
         │
2. First-time channel prompt
   (if preferred_channel not
    yet explicitly set):
   ┌─────────────────────────────┐
   │ How would you like to hear  │
   │ back from property owners   │
   │ and listing agents?         │
   │                             │
   │ ┌──────────┐ ┌──────────┐  │
   │ │ 📱 Text  │ │ 📧 Email │  │
   │ └──────────┘ └──────────┘  │
   │                             │
   │ Change anytime in Settings  │
   └─────────────────────────────┘
         │
3. Compose message
   (pre-filled with listing context):
   ┌─────────────────────────────┐
   │ [Listing photo + address]   │
   │ ─────────────────────────── │
   │ Hi! I'm interested in      │
   │ [address]. [cursor]         │
   │                             │
   │         [Send Message]      │
   └─────────────────────────────┘
         │
4. POST /api/conversations
   { listing_id, initial_message }
         │
         ├──→ Create conversation
         │    (conversation_type: internal_owner)
         │
         ├──→ Insert message
         │    (channel: in_app, sender_id: renter)
         │
         ├──→ Check owner.preferred_channel
         │
         ├──→ IF 'email':                 ──→ Resend email to owner
         │    Reply-To:                        with listing photo, renter
         │    conv-{uuid}@inbound...           message, reply instructions
         │
         ├──→ IF 'sms':                   ──→ Twilio SMS to owner
         │    (sms_consent required)           "PadMagnet: A renter is
         │                                     interested in your listing
         │                                     at [address]. Open the app
         │                                     to view their message."
         │
         ├──→ IF 'in_app':                ──→ Push notification only
         │
         └──→ Upsert phone_mapping
              (for owner SMS replies)
         │
5. Renter sees in thread:
   System message:
   "Message sent! The owner will
    be notified via [channel]."
```

### Flow 2: Renter Messages an MLS Listing Agent (External)

```
RENTER (mobile app)                        SYSTEM                              AGENT (out of app)
───────────────────                        ──────                              ──────────────────
1. Taps "Message Agent"
   on MLS listing card
         │
2. Same first-time channel
   prompt as Flow 1 (for
   renter's OWN reply preference)
         │
3. Compose message
   (pre-filled with listing context)
         │
4. POST /api/conversations
   { listing_id, initial_message }
         │
         ├──→ Detect source = 'mls'
         │
         ├──→ Create conversation
         │    conversation_type: external_agent
         │    owner_user_id: null
         │    external_agent_name/email/phone
         │
         ├──→ Insert message
         │    (channel: in_app, sender_id: renter)
         │
         ├──→ Email to agent (email only, no SMS) ──→ Agent receives email:
         │    From: PadMagnet <noreply@padmagnet.com>
         │    Subject: "Rental Inquiry: [address]"
         │    Reply-To: conv-{uuid}@inbound.padmagnet.com
         │    ┌────────────────────────────────────┐
         │    │ Hi [Agent Name],                   │
         │    │                                    │
         │    │ A renter on PadMagnet is           │
         │    │ interested in your listing:        │
         │    │                                    │
         │    │ [Listing photo]                    │
         │    │ [Address, City]                    │
         │    │                                    │
         │    │ Their message:                     │
         │    │ "[renter's message]"               │
         │    │                                    │
         │    │ Reply to this email to respond     │
         │    │ directly to the renter.            │
         │    └────────────────────────────────────┘
         │
5. Renter sees in thread:
   ┌─────────────────────────────────────────┐
   │ Header: [Address]                       │
   │ Subtitle: "Listed by [Agent Name]"      │
   ├─────────────────────────────────────────┤
   │                                         │
   │ ℹ️ This listing is managed by           │
   │ [Agent Name]. They'll receive your      │
   │ message via email and can reply          │
   │ directly to you.                        │
   │                                         │
   │  ┌─────────────────────────┐            │
   │  │ Hi! I'm interested in   │            │
   │  │ this property...         │            │
   │  └─────────────────────────┘            │
   │   2:34 PM  Delivered via email ✓        │
   │                                         │
   └─────────────────────────────────────────┘
```

### Flow 3: Agent Replies via Email → Renter Sees in App

```
AGENT (Gmail/Outlook)                      SYSTEM                              RENTER
─────────────────────                      ──────                              ──────
1. Receives inquiry email
   Hits Reply, types response
         │
2. Email arrives at
   conv-{uuid}@inbound.padmagnet.com
         │
3. Resend receives via MX records
   Fires webhook: email.received
         │
4. POST /api/webhooks/resend
         │
         ├──→ Verify Svix signature
         ├──→ Fetch full email via Resend API
         ├──→ Strip reply chain (quoted text)
         ├──→ Parse conversation UUID from To:
         ├──→ Verify sender = external_agent_email
         ├──→ Dedup check (external_id)
         │
         ├──→ Insert message
         │    channel: 'email'
         │    sender_id: null
         │    delivery_status: 'delivered'
         │
         ├──→ Increment tenant_unread_count
         │
         ├──→ Supabase Realtime fires        ──→ If app open: message
         │                                        appears instantly
         │
         ├──→ Notify renter per preference   ──→ SMS/email/push to renter
         │    "PadMagnet: [Agent Name]
         │     replied about [address].
         │     Open PadMagnet to read it."
         │
5.                                                Renter sees reply in thread:
                                                  ┌───────────────────────────┐
                                                  │ [Agent Name]              │
                                                  │ "Yes, it's available!     │
                                                  │  Would you like to        │
                                                  │  schedule a showing?"     │
                                                  └───────────────────────────┘
                                                   3:01 PM  Delivered ✓
                                                   (gray checks — never "Read")
```

### Flow 4: Owner Replies from Desktop Email → Renter Sees in App

Same as Flow 3, except:
- Sender is verified against `owner_user_id` profile email (not `external_agent_email`)
- `sender_id` is set to the owner's user ID (not null)
- Read receipts can show "Read" (blue checks) because owner is a PadMagnet user
- System message to renter: "Owner replied via email"

### Flow 5: Direct Contact Fallback

**Agent listings — immediate (0 hours):**
Agent contact info from MLS data is shown immediately alongside the system message when the conversation is created. The renter already used PadMagnet's contact tool (building engagement), and the agent's info is public MLS data — no reason to withhold it.

```
RENTER sees immediately in thread (agent conversations):

   ┌─────────────────────────────────────────┐
   │ ℹ️ This listing is managed by           │
   │ [Agent Name]. They'll receive your      │
   │ message via email and can reply          │
   │ directly to you.                        │
   │                                         │
   │ You can also reach them directly:       │
   │ 📧 agent@brokerage.com                  │
   │ 📞 (555) 123-4567                       │
   └─────────────────────────────────────────┘
```

**Owner listings — 8 hours:**
Owner contact info is shown after 8 hours with no reply, giving the owner a reasonable window to respond via the app first.

```
RENTER sees in thread after 8h with no owner reply:

   ┌─────────────────────────────────────────┐
   │ ⏳ No reply yet from [Owner Name].      │
   │                                         │
   │ You can reach them directly:            │
   │ 📧 owner@email.com                      │
   │ 📞 (555) 123-4567                       │
   └─────────────────────────────────────────┘
```

---

## Section 3: In-App Messaging UX

### Approach: Enhance Existing Custom Implementation

Skip Gifted Chat — you already have working `ChatInput.js`, `MessageBubble.js`, `ConversationItem.js`, and `MessagesScreen.js` wired to Supabase Realtime. Build incrementally on what exists.

### Conversation Header — Context Awareness

```
OWNER LISTING:                          AGENT LISTING:
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ ← 8362 SE Magnolia Ave  ••• │       │ ← 8362 SE Magnolia Ave  ••• │
│   Listed by Chris Lundstrom  │       │   Hobe Sound, FL             │
└──────────────────────────────┘       │   Listed by John Smith       │
                                       └──────────────────────────────┘
```

- **Owner listings**: subtitle shows owner's public display name ("Listed by [display_name]")
- **Agent listings**: subtitle shows city/state AND agent name (agents may have similar street names across cities — accuracy matters)

### Message Bubble Enhancements

```
RENTER'S MESSAGE (right-aligned, accent color):
         ┌─────────────────────────┐
         │ Hi! I'm interested in   │
         │ this property.           │
         └─────────────────────────┘
          2:34 PM  Delivered via email ✓

OWNER REPLY (left-aligned, surface color):
┌─────────────────────────┐
│ Yes! Would you like to  │
│ schedule a showing?     │
└─────────────────────────┘
 3:01 PM  ✓✓ Read

AGENT REPLY (left-aligned, surface color):
┌─────────────────────────┐
│ [Agent Name]             │  ← label for external agents
│ Yes! Would you like to  │
│ schedule a showing?     │
└─────────────────────────┘
 3:01 PM  Delivered ✓        ← never "Read" for agents
```

### Channel Delivery Indicators

Below each sent message, show how it was delivered:

| Scenario | Indicator |
|---|---|
| Sent in-app, not yet delivered externally | "Sent ✓" (gray) |
| Delivered via SMS to owner | "Delivered via SMS ✓✓" (gray) |
| Delivered via email to owner or agent | "Delivered via email ✓✓" (gray) |
| Read by owner (in-app) | "Read ✓✓" (blue) |
| Agent message — max status | "Delivered ✓✓" (gray, never blue) |
| Delivery failed, retrying | "Sending..." (with retry icon) |

Uses existing `delivery_status` and `channel` fields on the `messages` table.

### System Messages (Inline, Non-Bubble)

Centered, muted text inserted into the thread at key moments:

| Trigger | System Message |
|---|---|
| New conversation with owner | "Message sent! The owner will be notified via [email/SMS]." |
| New conversation with agent | "This listing is managed by [Agent Name]. They'll receive your message via email and can reply directly to you. You can also reach them at: [email] [phone]" |
| Agent replies | (no system message — the bubble label "[Agent Name]" is sufficient) |
| Owner replies from email | "Owner replied via email" |
| 8h no reply (owner only) | "No reply yet from [Owner Name]. You can reach them directly: [email] [phone]" |
| SMS opt-out received | "SMS notifications have been turned off. You can re-enable in Settings." |

### Typing Indicators (Owner Conversations Only)

Via Supabase Realtime presence — one channel per conversation:

```js
const typingChannel = supabase.channel(`typing-${conversationId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = typingChannel.presenceState();
    const othersTyping = Object.values(state)
      .flat()
      .filter(p => p.user_id !== myUserId && p.typing);
    setIsTyping(othersTyping.length > 0);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await typingChannel.track({ user_id: myUserId, typing: false });
    }
  });
```

Not applicable for agent conversations (agents are never in-app).

### Rich Composer (Phase 2)

```
┌─────────────────────────────────────────┐
│ 📷  📎  │ Type a message...    │ Send │  │
└─────────────────────────────────────────┘
```

- OS-level spellcheck + autocorrect (built into TextInput — free)
- 📷 Camera: `expo-image-picker` → Supabase Storage upload → image message
- 📎 File: `expo-document-picker` → upload → file message
- Emoji: OS keyboard (no separate picker needed)
- New `attachments` jsonb field on messages table

### Conversation List — Visual Differentiation

```
OWNER CONVERSATION:                      AGENT CONVERSATION:
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ [Photo] 8362 SE Magnolia Ave │        │ [Photo] 8075 SE Palm St      │
│  Listed by Chris Lundstrom   │        │  Hobe Sound, FL              │
│         "Yes! Would you..."  │        │  via John Smith (Agent)       │
│         2 min ago    ✓✓ Read │        │         "Yes! Would you..."  │
└──────────────────────────────┘        │         1 hr ago   ✓✓        │
                                        └──────────────────────────────┘
```

- **Owner conversations**: show owner display name
- **Agent conversations**: show street address + city/state + agent name — busy agents may have similar street names across cities, full address prevents confusion

---

## Section 4: Implementation Details & Edge Cases

### Webhook Registration (One-Time Setup)

1. **Twilio console**: Set webhook URL for (253) 600-3665 to `https://padmagnet.com/api/webhooks/twilio` (POST, form-encoded)
2. **Twilio console**: Status callback already configured via `statusCallback` in `lib/sms.js`
3. **Resend dashboard**: Verify `inbound.padmagnet.com` MX records are active in Vercel DNS
4. **Resend dashboard**: Webhook endpoint set to `https://padmagnet.com/api/webhooks/resend`

### Welcome SMS on First Consent

When user toggles SMS ON in settings, send immediately:

```
PadMagnet: You're now signed up for SMS notifications
(inquiry alerts, listing reminders, messages).
Msg frequency varies. Msg & data rates may apply.
Reply HELP for help. Reply STOP to opt out.
padmagnet.com/terms
```

This is CTIA-required for the first message after opt-in.

### SMS Frequency Cap

A2P approval declares 1-5 messages/week. Enforce in `lib/sms.js`:

```js
async function checkFrequencyCap(supabase, recipientPhone) {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('to_phone', recipientPhone)
    .eq('channel', 'sms')
    .gte('created_at', weekAgo);
  return (count || 0) < 5;
}
```

If cap reached, skip SMS and deliver via push only. Log the skip.

**Important:** This cap applies ONLY to outbound SMS notifications from PadMagnet's Twilio number to a user's phone. It does NOT limit in-app messages (unlimited), email notifications (unlimited), or push notifications (unlimited). The user never misses a message — they just don't get the SMS buzz for the 6th+ notification that week.

### STOP Handler Enhancement

Current webhook handles STOP by setting `sms_consent = false`. Also set `preferred_channel = 'in_app'` so the user doesn't end up with no notifications:

```js
if (isOptOut) {
  await supabase.from('profiles')
    .update({ sms_consent: false, preferred_channel: 'in_app' })
    .eq('phone', fromPhone);
}
```

### External Agent — Email Only (No SMS)

Remove SMS path from `notifyExternalAgent()` in `lib/notify.js`:

```js
export async function notifyExternalAgent(message, conversation) {
  const { external_agent_email, external_agent_name } = conversation;

  if (!external_agent_email) {
    // No email on file — log and skip. Agent contact info is shown
    // immediately to the renter in the conversation thread as fallback.
    console.warn('[Notify] External agent has no email:', conversation.id);
    return;
  }

  await sendImmediatelyOrEnqueue(supabase, message.id, null, 'email', {
    to: external_agent_email,
    recipient_name: external_agent_name || 'Listing Agent',
    sender_name: message.sender_name,
    listing_address: conversation.listing_address,
    message_preview: message.body.slice(0, 300),
    conversationId: conversation.id,
    isExternalAgent: true,
  });
}
```

No phone_mappings upsert for external agents. No SMS fallback.

### Contact Fallback Logic

**Agent conversations — immediate:**
Agent contact info (email + phone from MLS data) is shown in the system message as soon as the conversation is created. No timer needed — the data is public and the renter has already engaged via PadMagnet's contact tool.

**Owner conversations — 8 hours:**
Client-side check: if `conversation_type = 'internal_owner'` and no reply from owner exists, and conversation is older than 8 hours, show the fallback card:

```js
// In conversation/[id].js
const OWNER_FALLBACK_MS = 8 * 60 * 60 * 1000; // 8 hours
const showOwnerFallback = !isExternal
  && messages.every(m => m.sender_id === userId || m.sender_id === null) // no owner replies
  && new Date() - new Date(messages[0]?.created_at) > OWNER_FALLBACK_MS;
```

### Offline Message Queue

If app is offline when renter taps Send, queue in AsyncStorage and flush on reconnect:

```js
const QUEUE_KEY = 'padmagnet_message_queue';

async function sendOrQueue(conversationId, body) {
  try {
    return await apiFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, body }),
    });
  } catch {
    const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ conversationId, body, queuedAt: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return { queued: true };
  }
}
```

### Renter-Facing Copy — Complete Reference

Every string that references the message recipient must account for both owners and agents:

| Location | Copy |
|---|---|
| First-message channel prompt | "How would you like to hear back from property owners and listing agents?" |
| Post-send (owner listing) | "Message sent! The owner will be notified via [channel]." |
| Post-send (agent listing) | "Message sent! The listing agent ([name]) will be notified via email." |
| Conversation header subtitle (agent) | "Listed by [Agent Name]" |
| System message (agent conversation) | "This listing is managed by [Agent Name]. They'll receive your message via email and can reply directly to you." |
| Agent contact fallback (immediate) | Shown in system message on conversation create — agent email + phone from MLS data |
| 8h no-reply (owner only) | "No reply yet from [Owner Name]. You can reach them directly:" |
| Inbox empty state (renter) | "Message owners and listing agents about properties you love" |
| Inbox empty state (owner) | "Renters will reach out when interested in your listing." |
| Owner messages tab (anon teaser) | "Communicate effortlessly with renters" |
| Notification for agent reply | "PadMagnet: [Agent Name] replied about [address]. Open PadMagnet to read it." |
| Notification for owner reply | "PadMagnet: You have a new message from a property owner about [address]." |
| Settings channel prompt | (LOCKED — do not change, A2P approved) |

---

## Section 5: Phased Roadmap

### Phase 1: Activate Comms (1-2 Weeks)

All items use existing infrastructure — no new tables, no new libraries.

| # | Task | Effort | What It Unlocks |
|---|------|--------|-----------------|
| 1 | Register Twilio webhook URL for (253) 600-3665 in console | 10 min | Inbound SMS replies work |
| 2 | Verify `inbound.padmagnet.com` MX records in Vercel DNS | 10 min | Inbound email replies work |
| 3 | Send welcome SMS on consent toggle ON (`/api/profiles/sms-consent`) | 1 hr | CTIA compliance |
| 4 | Add frequency cap check (5/week) in `lib/sms.js` | 1 hr | A2P compliance |
| 5 | Update STOP handler: also set `preferred_channel = 'in_app'` | 30 min | No dead-end users |
| 6 | Remove SMS path from `notifyExternalAgent()` — email only | 1 hr | Clean agent routing |
| 7 | Remove `phone_mappings` upsert for external agents in `/api/conversations` | 30 min | No phone collisions |
| 8 | Add channel delivery indicator to `MessageBubble.js` ("Delivered via email ✓") | 2 hrs | Renter sees delivery channel |
| 9 | Add "Listed by [Agent Name]" subtitle to conversation header for agent convos | 1 hr | Clear context |
| 10 | Add system message on agent conversation create | 2 hrs | Set renter expectations |
| 11 | Differentiate post-send confirmation: owner vs agent copy | 1 hr | Accurate messaging |
| 12 | Update all renter-facing copy per reference table above | 2 hrs | Consistent language |
| 13 | First-time channel preference prompt (inline, before first message) | 4 hrs | Capture preference early |
| 14 | End-to-end test: renter → owner (email pref) → owner replies Gmail → renter sees in app | 2 hrs | Validate owner loop |
| 15 | End-to-end test: renter → agent (email) → agent replies Gmail → renter sees in app | 2 hrs | Validate agent loop |
| 16 | End-to-end test: renter → owner (SMS pref) → owner replies in app → renter gets SMS | 2 hrs | Validate SMS loop |

**Phase 1 total: ~3-4 days. Full comms system goes live.**

### Phase 2: Premium UX (2-4 Weeks)

| # | Task | Effort | What It Unlocks |
|---|------|--------|-----------------|
| 1 | Contact fallback: immediate agent info in system message + 8-hour owner fallback card | 3 hrs | Renter always has a way forward |
| 2 | Typing indicators via Supabase Realtime presence (owner convos only) | 4 hrs | Live "typing..." dots |
| 3 | Time grouping + date separators ("Today", "Yesterday") | 3 hrs | Cleaner thread layout |
| 4 | Agent name + "Agent" badge on conversation list items | 2 hrs | Visual differentiation in inbox |
| 5 | Rich composer bar (camera, attachment actions) | 1 week | Photo/file sharing |
| 6 | Image message type + Supabase Storage upload | 3 days | Photos inline in chat |
| 7 | Message reactions (long-press → 6 emoji overlay) | 3 days | Engagement |
| 8 | Swipe-to-reply with quoted message | 2 days | Threaded context |
| 9 | Offline message queue (AsyncStorage flush on reconnect) | 4 hrs | Resilience |
| 10 | Push notification deep link → open specific conversation | 3 hrs | Tap notification → thread |

### Phase 3: Polish & Scale (Ongoing)

| # | Task | Effort |
|---|------|--------|
| 1 | Web-based conversation viewer (read-only link in agent emails) | 3 days |
| 2 | Agent response rate tracking in admin dashboard | 1 day |
| 3 | Smart retry: if agent email not opened in 8h, re-send with different subject | 4 hrs |
| 4 | Message search (full-text on `messages.body`) | 2 days |
| 5 | Auto-archive after 30 days inactive | 2 hrs |
| 6 | Conversation analytics (response times, channel usage) in admin | 2 days |
| 7 | Link previews (OG metadata cards in thread) | 2 days |
| 8 | Voice notes (stretch goal) | 1 week |

---

## Appendix: Key Files Reference

**Database:**
- `supabase/migrations/008_conversations_messages.sql` — core tables
- `supabase/migrations/015_messaging_multichannel.sql` — channel fields
- `supabase/migrations/038_communications_system.sql` — external agents, phone mappings, delivery queue, preferences
- `supabase/migrations/040_read_receipts_archive.sql` — per-user read cursors, archive

**API Routes:**
- `app/api/conversations/route.js` — create/list conversations
- `app/api/messages/route.js` — send/fetch messages
- `app/api/conversations/[id]/mark-read/route.js` — read receipts
- `app/api/conversations/[id]/archive/route.js` — archive/unarchive
- `app/api/webhooks/twilio/route.js` — inbound SMS
- `app/api/webhooks/twilio-status/route.js` — SMS delivery status
- `app/api/webhooks/resend/route.js` — inbound email
- `app/api/profiles/sms-consent/route.js` — SMS consent toggle
- `app/api/cron/delivery-retry/route.js` — retry failed deliveries

**Libraries:**
- `lib/notify.js` — channel routing + immediate delivery
- `lib/sms.js` — Twilio SMS sending + signature validation
- `lib/email.js` — Resend email templates + sending
- `lib/push.js` — Expo push notifications

**Mobile:**
- `mobile/app/conversation/[id].js` — chat screen
- `mobile/components/messaging/ChatInput.js` — message composer
- `mobile/components/messaging/MessageBubble.js` — message display
- `mobile/components/messaging/ConversationItem.js` — inbox list item
- `mobile/components/screens/MessagesScreen.js` — inbox with Realtime
- `mobile/app/settings/notifications.js` — preferences (LOCKED)

**Twilio:**
- Phone: (253) 600-3665 / +12536003665
- A2P Brand: `BNcaa4e3576fb3eb2b670845f4950da260`
- A2P Campaign: `CM0b1b1f1ba62a8e21f6036f8ea77d00ad` — APPROVED
