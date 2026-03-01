-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 008: Conversations & Messages                         ║
-- ║  Two-sided messaging between tenants and landlords/agents.       ║
-- ║  Realtime enabled on messages for live chat.                     ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES listings(id),
  tenant_user_id uuid REFERENCES auth.users(id) NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id),

  -- Denormalized for list display
  listing_address text,
  listing_photo_url text,

  last_message_text text,
  last_message_at timestamptz,

  tenant_unread_count integer DEFAULT 0,
  owner_unread_count integer DEFAULT 0,

  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_user_id);
CREATE INDEX idx_conversations_owner ON conversations(owner_user_id);
CREATE INDEX idx_conversations_listing ON conversations(listing_id);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own conversations"
  ON conversations FOR SELECT TO authenticated
  USING (tenant_user_id = auth.uid() OR owner_user_id = auth.uid());

CREATE POLICY "Tenants can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (tenant_user_id = auth.uid());

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (tenant_user_id = auth.uid() OR owner_user_id = auth.uid());

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  body text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages"
  ON messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE tenant_user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE tenant_user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

-- Enable realtime for live messaging
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
