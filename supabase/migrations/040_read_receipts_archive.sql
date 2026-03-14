-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 040: Read receipts and per-user archive             ║
-- ║  Adds conversation-level read cursors and per-user archive     ║
-- ║  flags. Message-level read_at for precise receipt display.     ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- A. Conversation-level read cursors (one per participant)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS tenant_last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_last_read_at timestamptz;

-- B. Per-user archive flags (independent)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS archived_by_tenant boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_by_owner boolean DEFAULT false;

-- C. Per-message read_at for display in thread view
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- D. Index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_unread
  ON conversations (tenant_user_id, archived_by_tenant)
  WHERE tenant_unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_conversations_owner_unread
  ON conversations (owner_user_id, archived_by_owner)
  WHERE owner_unread_count > 0;

-- E. Index for archive tab queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_archived
  ON conversations (tenant_user_id)
  WHERE archived_by_tenant = true;

CREATE INDEX IF NOT EXISTS idx_conversations_owner_archived
  ON conversations (owner_user_id)
  WHERE archived_by_owner = true;

-- F. RPC: mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id uuid,
  p_user_id uuid,
  p_role text
) RETURNS void AS $$
BEGIN
  IF p_role = 'tenant' THEN
    UPDATE conversations
    SET tenant_last_read_at = now(),
        tenant_unread_count = 0,
        updated_at = now()
    WHERE id = p_conversation_id
      AND tenant_user_id = p_user_id;

    UPDATE messages
    SET read_at = now()
    WHERE conversation_id = p_conversation_id
      AND sender_id IS DISTINCT FROM p_user_id
      AND read_at IS NULL;
  ELSIF p_role = 'owner' THEN
    UPDATE conversations
    SET owner_last_read_at = now(),
        owner_unread_count = 0,
        updated_at = now()
    WHERE id = p_conversation_id
      AND owner_user_id = p_user_id;

    UPDATE messages
    SET read_at = now()
    WHERE conversation_id = p_conversation_id
      AND sender_id IS DISTINCT FROM p_user_id
      AND read_at IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- G. Update increment_unread to auto-unarchive on new message
CREATE OR REPLACE FUNCTION increment_unread(
  p_conversation_id uuid,
  p_role text
) RETURNS void AS $$
BEGIN
  IF p_role = 'tenant' THEN
    UPDATE conversations
    SET tenant_unread_count = tenant_unread_count + 1,
        last_message_at = now(),
        archived_by_tenant = false,
        updated_at = now()
    WHERE id = p_conversation_id;
  ELSIF p_role = 'owner' THEN
    UPDATE conversations
    SET owner_unread_count = owner_unread_count + 1,
        last_message_at = now(),
        archived_by_owner = false,
        updated_at = now()
    WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
