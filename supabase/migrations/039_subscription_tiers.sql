-- Migration 039: Subscription tier system
-- Adds tier tracking to profiles, listing limit enforcement, testimonials table, and analytics view

-- 1. Add tier columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'pro', 'premium'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Listing limit enforcement trigger
-- Prevents owners from activating more listings than their tier allows
CREATE OR REPLACE FUNCTION check_listing_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM listings
  WHERE owner_user_id = NEW.owner_user_id AND status = 'active';

  SELECT CASE
    WHEN p.tier = 'free' THEN 1
    WHEN p.tier = 'pro' THEN 5
    WHEN p.tier = 'premium' THEN 999
    ELSE 1
  END INTO max_allowed
  FROM profiles p WHERE p.id = NEW.owner_user_id;

  -- Only block new activations, not updates to existing active listings
  IF active_count >= max_allowed AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Listing limit reached for your plan. Upgrade to add more listings.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only fire on INSERT with status = 'active' (not drafts, not updates)
DROP TRIGGER IF EXISTS trg_check_listing_limit ON listings;
CREATE TRIGGER trg_check_listing_limit
  BEFORE INSERT ON listings
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION check_listing_limit();

-- 3. Testimonials table (for real beta tester quotes and future in-app reviews)
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  quote TEXT NOT NULL,
  display_name TEXT NOT NULL,
  location TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS on testimonials — only admins manage, public reads approved
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved testimonials"
  ON testimonials FOR SELECT
  USING (approved = true);

-- 4. Listing analytics view (for owner dashboard, Pro+ only)
-- Uses security_invoker so RLS is respected
CREATE OR REPLACE VIEW listing_analytics
WITH (security_invoker = true) AS
SELECT
  l.id AS listing_id,
  l.owner_user_id,
  COUNT(DISTINCT lv.user_id) AS unique_views,
  COUNT(DISTINCT CASE WHEN s.direction = 'right' THEN s.user_id END) AS right_swipes,
  COUNT(DISTINCT CASE WHEN s.direction = 'left' THEN s.user_id END) AS left_swipes,
  COUNT(DISTINCT c.id) AS conversations,
  ROUND(
    COUNT(DISTINCT CASE WHEN s.direction = 'right' THEN s.user_id END)::numeric /
    NULLIF(COUNT(DISTINCT s.user_id), 0) * 100, 1
  ) AS save_rate
FROM listings l
LEFT JOIN listing_views lv ON lv.listing_id = l.id
LEFT JOIN swipes s ON s.listing_id = l.id
LEFT JOIN conversations c ON c.listing_id = l.id
WHERE l.source = 'owner'
GROUP BY l.id, l.owner_user_id;
