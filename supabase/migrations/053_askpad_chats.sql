-- 053: Ask Pad chat persistence (AsyncStorage + Supabase hybrid)
-- One row per user, jsonb messages array, capped at 50 client-side.

CREATE TABLE IF NOT EXISTS askpad_chats (
  user_id    uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  messages   jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for admin lookups (e.g., "show me renters who chatted recently")
CREATE INDEX idx_askpad_chats_updated ON askpad_chats (updated_at DESC);

-- RLS
ALTER TABLE askpad_chats ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own row
CREATE POLICY "Users can read own chat"
  ON askpad_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own chat"
  ON askpad_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat"
  ON askpad_chats FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (admin API) bypasses RLS automatically
