-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 038: Communications system + external MLS agents    ║
-- ║  Twilio SMS, Resend email, Expo push, external agent routing.  ║
-- ║  Builds on 008 (conversations/messages) and 015 (multichannel) ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ============================================================
-- A. External agent columns on conversations
--    conversation_type, agent name/email/phone
--    (tenant_unread_count, owner_unread_count, listing_address,
--     last_message_text, last_message_at already exist from 008)
-- ============================================================

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_type text DEFAULT 'internal_owner'
    CHECK (conversation_type IN ('internal_owner', 'external_agent')),
  ADD COLUMN IF NOT EXISTS external_agent_name text,
  ADD COLUMN IF NOT EXISTS external_agent_email text,
  ADD COLUMN IF NOT EXISTS external_agent_phone text;

-- ============================================================
-- B. Fix messages.sender_id to allow NULL for external agents
--    (was NOT NULL in migration 008 — external agent replies
--     from webhooks need sender_id = NULL since agents have
--     no auth.users row)
-- ============================================================

ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;

-- ============================================================
-- C. Add UNIQUE constraint on messages.external_id for dedup
--    (015 added the column but without UNIQUE — needed to
--     prevent duplicate webhook insertions)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id_unique
  ON messages(external_id)
  WHERE external_id IS NOT NULL;

-- ============================================================
-- D. Replace messages RLS policies
--    Old (from 008): "Participants can read messages" required
--    sender_id = auth.uid() for INSERT. New policies use
--    EXISTS subquery for both SELECT and INSERT, and don't
--    require sender_id match (webhooks use service role anyway).
-- ============================================================

DROP POLICY IF EXISTS "Participants can read messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

CREATE POLICY "Users see own messages"
  ON messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.tenant_user_id = auth.uid() OR c.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Participants insert messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.tenant_user_id = auth.uid() OR c.owner_user_id = auth.uid())
    )
  );

-- ============================================================
-- E. Profile communication columns
--    (phone already exists from 004)
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_channel text DEFAULT 'in_app'
    CHECK (preferred_channel IN ('in_app', 'sms', 'email')),
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_ip text,
  ADD COLUMN IF NOT EXISTS expo_push_token text;

-- Role-based default: tenants get SMS, owners get email
-- Applied via trigger on INSERT (can't reference other columns in DEFAULT)
CREATE OR REPLACE FUNCTION set_default_preferred_channel()
RETURNS trigger AS $$
BEGIN
  IF NEW.preferred_channel IS NULL OR NEW.preferred_channel = 'in_app' THEN
    IF NEW.role = 'tenant' THEN
      NEW.preferred_channel := 'sms';
    ELSE
      NEW.preferred_channel := 'email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_default_preferred_channel ON profiles;
CREATE TRIGGER trg_default_preferred_channel
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_preferred_channel();

-- ============================================================
-- F. Webhook logs — audit trail for all inbound/outbound events
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('twilio', 'resend', 'expo')),
  event_type text NOT NULL,
  external_id text,
  payload jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'failed', 'duplicate')),
  error_message text,
  conversation_id uuid REFERENCES conversations(id),
  message_id uuid REFERENCES messages(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source
  ON webhook_logs(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_external_id
  ON webhook_logs(external_id);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
-- No policies = deny all via client. Service role only.

-- ============================================================
-- G. Message templates for SMS/email notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  subject text,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO message_templates (slug, channel, subject, body, variables) VALUES
  ('new_message_sms', 'sms', NULL,
   'PadMagnet: New message about {{listing_address}} from {{sender_name}}. Reply here or open the app to respond.',
   '{listing_address, sender_name, message_preview}'),
  ('new_message_email', 'email', 'New message about {{listing_address}}',
   '<p>Hi {{recipient_name}},</p><p><strong>{{sender_name}}</strong> sent you a message about <strong>{{listing_address}}</strong>:</p><blockquote>{{message_preview}}</blockquote><p>Reply to this email or <a href="{{inbox_url}}">open the app</a> to respond.</p><p>-- PadMagnet</p>',
   '{recipient_name, sender_name, listing_address, message_preview, inbox_url}'),
  ('external_agent_sms', 'sms', NULL,
   'Hi {{agent_name}}, a renter on PadMagnet is interested in {{listing_address}}. They said: "{{message_preview}}" — Reply to this text to respond.',
   '{agent_name, listing_address, message_preview}'),
  ('external_agent_email', 'email', 'Rental inquiry about {{listing_address}}',
   '<p>Hi {{agent_name}},</p><p>A renter on PadMagnet is interested in your listing at <strong>{{listing_address}}</strong>.</p><blockquote>{{message_preview}}</blockquote><p>Simply reply to this email to respond directly to the renter.</p><p>-- PadMagnet</p>',
   '{agent_name, listing_address, message_preview}')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
-- No policies = admin only via service role.

-- ============================================================
-- H. Phone number mapping for inbound SMS routing
--    user_id is NULLABLE: NULL = external MLS agent (no account)
-- ============================================================

CREATE TABLE IF NOT EXISTS phone_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_number text NOT NULL,
  user_phone text NOT NULL,
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(twilio_number, user_phone)
);

CREATE INDEX IF NOT EXISTS idx_phone_mappings_lookup
  ON phone_mappings(twilio_number, user_phone);

ALTER TABLE phone_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own phone mappings"
  ON phone_mappings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- I. Delivery retry queue (failed first attempts only)
--    recipient_id is NULLABLE: NULL for external agent deliveries
-- ============================================================

CREATE TABLE IF NOT EXISTS message_delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id),
  channel text NOT NULL CHECK (channel IN ('sms', 'email', 'push')),
  recipient_id uuid REFERENCES auth.users(id),
  payload jsonb NOT NULL DEFAULT '{}',
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  next_attempt_at timestamptz DEFAULT now(),
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_queue_pending
  ON message_delivery_queue(next_attempt_at)
  WHERE status = 'pending';

ALTER TABLE message_delivery_queue ENABLE ROW LEVEL SECURITY;
-- No policies = admin only via service role.

-- ============================================================
-- J. Publish conversations to Supabase Realtime
--    (messages already published in migration 008)
--    Enables live unread badge updates for both tenant + owner
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ============================================================
-- K. Atomic unread increment function
--    Called by webhooks and message API to avoid race conditions
-- ============================================================

CREATE OR REPLACE FUNCTION increment_unread(
  p_conversation_id uuid,
  p_role text
) RETURNS void AS $$
BEGIN
  IF p_role = 'tenant' THEN
    UPDATE conversations
    SET tenant_unread_count = tenant_unread_count + 1,
        last_message_at = now()
    WHERE id = p_conversation_id;
  ELSIF p_role = 'owner' THEN
    UPDATE conversations
    SET owner_unread_count = owner_unread_count + 1,
        last_message_at = now()
    WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
