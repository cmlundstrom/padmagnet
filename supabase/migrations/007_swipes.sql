-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 007: Swipes                                           ║
-- ║  Records each user's swipe decisions. One swipe per user per     ║
-- ║  listing. Direction: 'left' (skip) or 'right' (save).           ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS swipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('left', 'right')),
  padscore integer,                        -- snapshot of score at swipe time
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_swipes_user ON swipes(user_id);
CREATE INDEX idx_swipes_user_direction ON swipes(user_id, direction);
CREATE INDEX idx_swipes_listing ON swipes(listing_id);
CREATE INDEX idx_swipes_created ON swipes(created_at DESC);

-- RLS
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own swipes"
  ON swipes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
