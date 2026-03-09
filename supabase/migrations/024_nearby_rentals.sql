-- Migration 024: Nearby Rentals Access feature
-- Adds feature_key to products, days_on_market to listings,
-- listing_price_history table, and seeds the product row.

-- 1. Add feature_key column to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS feature_key VARCHAR(50) UNIQUE;

COMMENT ON COLUMN products.feature_key IS
  'Stable programmatic key for feature-gating. Admin can rename display name without breaking code.';

-- 2. Add days_on_market to listings (Bridge provides OnMarketDate)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS days_on_market INTEGER;

COMMENT ON COLUMN listings.days_on_market IS
  'Standard IDX field. Computed during sync: CURRENT_DATE - on_market_date.';

-- 3. Create listing_price_history table (audit trail for owner price edits)
CREATE TABLE IF NOT EXISTS listing_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  old_price NUMERIC(12,2) NOT NULL,
  new_price NUMERIC(12,2) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing
  ON listing_price_history(listing_id, changed_at DESC);

-- RLS: owners can read their own price history
ALTER TABLE listing_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own price history"
  ON listing_price_history FOR SELECT
  USING (
    changed_by = auth.uid()
  );

CREATE POLICY "Service role manages price history"
  ON listing_price_history FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- 4. Seed the Nearby Rentals Access product
INSERT INTO products (
  name, description, price_cents, type,
  is_active, is_implemented, sort_order,
  audience, feature_key, metadata
) VALUES (
  'Nearby Rentals Access',
  'See active rental listings near your property.' || chr(10) || 'Compare asking rents, beds/baths, and sqft in your area.' || chr(10) || '30-day access included free with your first listing.',
  900,
  'one_time',
  true,
  false,
  10,
  'owner',
  'nearby_rentals',
  '{"duration_days": 30, "free_trial_days": 30}'
)
ON CONFLICT (feature_key) DO NOTHING;
