-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 011: Products table                                  ║
-- ║  Admin-editable product catalog for listing fees, boosts, etc.  ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  type text NOT NULL CHECK (type IN ('one_time','recurring')),
  recurring_interval text CHECK (recurring_interval IN ('month','year')),
  stripe_price_id text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default products
INSERT INTO products (name, description, price_cents, type, sort_order) VALUES
  ('Basic 30-Day Listing', 'Your property listed on PadMagnet for 30 days with PadScore matching.', 2999, 'one_time', 1),
  ('Boosted Placement', 'Priority placement in tenant feeds for 30 days.', 1499, 'one_time', 2);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Service role manages products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
