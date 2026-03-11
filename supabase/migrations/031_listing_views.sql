-- Unique listing views table (one row per user per listing)
CREATE TABLE IF NOT EXISTS listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id)
);

-- Index for counting views per listing
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id ON listing_views (listing_id);

-- Enable RLS
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

-- Users can insert their own views
CREATE POLICY "Users can record own views"
  ON listing_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for owner view counts)
CREATE POLICY "Service role full access"
  ON listing_views FOR ALL
  USING (true)
  WITH CHECK (true);
