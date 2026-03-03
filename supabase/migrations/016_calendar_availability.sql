-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 016: Calendar / availability                         ║
-- ║  Recurring availability blocks + one-off showing requests.      ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES listings(id) NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT has_day_or_date CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS showing_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_user_id uuid REFERENCES auth.users(id) NOT NULL,
  listing_id uuid REFERENCES listings(id) NOT NULL,
  requested_slot timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','cancelled')),
  notes text,
  owner_response_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_availability_listing ON availability_blocks(listing_id);
CREATE INDEX idx_showings_listing ON showing_requests(listing_id);
CREATE INDEX idx_showings_tenant ON showing_requests(tenant_user_id);

-- RLS
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE showing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own availability" ON availability_blocks FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Anyone reads availability" ON availability_blocks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tenants create showing requests" ON showing_requests FOR INSERT TO authenticated
  WITH CHECK (tenant_user_id = auth.uid());
CREATE POLICY "Users read own showings" ON showing_requests FOR SELECT TO authenticated
  USING (tenant_user_id = auth.uid() OR listing_id IN (SELECT id FROM listings WHERE owner_user_id = auth.uid()));
CREATE POLICY "Owners update showings on own listings" ON showing_requests FOR UPDATE TO authenticated
  USING (listing_id IN (SELECT id FROM listings WHERE owner_user_id = auth.uid()));
