-- ============================================================
-- Renter Redesign: PadPoints, gamification, anonymous auth support
-- ============================================================

-- PadPoints / gamification columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS padpoints INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS padlevel INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_last_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- RLS: Block anonymous users from creating conversations
-- Anonymous users ARE authenticated in Supabase, so we check the JWT claim
DROP POLICY IF EXISTS "Tenants can create conversations" ON conversations;
CREATE POLICY "Non-anonymous users can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (NOT (auth.jwt() -> 'is_anonymous')::boolean);

-- RLS: Block anonymous users from sending messages
DROP POLICY IF EXISTS "Participants insert messages" ON messages;
CREATE POLICY "Non-anonymous users can insert messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (NOT (auth.jwt() -> 'is_anonymous')::boolean);
