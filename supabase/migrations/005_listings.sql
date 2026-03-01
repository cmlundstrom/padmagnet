-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 005: Listings table                                   ║
-- ║  Stores MLS listings (synced from Bridge API) and owner-posted   ║
-- ║  listings. Core table for the entire mobile app.                 ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Bridge MLS identifiers
  listing_key text UNIQUE NOT NULL,
  listing_id text,                          -- MLS number (e.g. RX-10998871)

  -- Source tracking
  source text DEFAULT 'mls' CHECK (source IN ('mls', 'owner')),
  owner_user_id uuid REFERENCES auth.users(id),

  -- Address
  street_number text,
  street_name text,
  city text,
  state_or_province text DEFAULT 'FL',
  postal_code text,
  county text,

  -- Coordinates (for map view + distance calc)
  latitude double precision,
  longitude double precision,

  -- Property details
  property_type text,                       -- e.g. 'Residential Lease'
  property_sub_type text,                   -- e.g. 'Condo', 'Single Family', 'Townhouse'
  list_price numeric(12,2),
  bedrooms_total integer,
  bathrooms_total numeric(4,2),
  living_area numeric(10,2),                -- sqft
  lot_size_area numeric(10,2),
  year_built integer,

  -- Lease specifics
  lease_term text,
  available_date date,

  -- Features (for PadScore)
  pets_allowed boolean,
  pets_deposit numeric(10,2),
  fenced_yard boolean,
  furnished boolean,
  hoa_fee numeric(10,2),
  parking_spaces integer,
  pool boolean,

  -- Media
  photos jsonb DEFAULT '[]',               -- [{url, caption, order}]
  virtual_tour_url text,

  -- Listing agent/office (MLS compliance)
  listing_agent_name text,
  listing_office_name text,
  listing_agent_phone text,
  listing_agent_email text,

  -- MLS metadata
  standard_status text DEFAULT 'Active',
  modification_timestamp timestamptz,
  mls_disclaimer text,

  -- PadMagnet metadata
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_listings_source ON listings(source);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_status ON listings(standard_status);
CREATE INDEX idx_listings_price ON listings(list_price);
CREATE INDEX idx_listings_active ON listings(is_active);
CREATE INDEX idx_listings_coords ON listings(latitude, longitude);
CREATE INDEX idx_listings_owner ON listings(owner_user_id) WHERE source = 'owner';

-- Trigger for updated_at
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active listings"
  ON listings FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role full access on listings"
  ON listings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Owners can manage their own listings"
  ON listings FOR ALL TO authenticated
  USING (source = 'owner' AND owner_user_id = auth.uid())
  WITH CHECK (source = 'owner' AND owner_user_id = auth.uid());
