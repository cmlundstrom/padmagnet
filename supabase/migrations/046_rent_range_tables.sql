-- ============================================================
-- RENT-RANGE TOOL — Standalone data layer
-- Completely isolated from PadMagnet app tables
-- ============================================================

-- Rental comps pulled from Bridge IDX (Active + Closed)
-- Separate from PadMagnet's listings table
CREATE TABLE IF NOT EXISTS rr_rental_comps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_key TEXT NOT NULL UNIQUE,
  listing_id TEXT,                        -- MLS number
  standard_status TEXT NOT NULL,          -- 'Active', 'Closed'

  -- Address
  street_number TEXT,
  street_name TEXT,
  unit_number TEXT,
  city TEXT,
  state TEXT DEFAULT 'FL',
  postal_code TEXT,
  county TEXT,                            -- e.g., 'Martin County'
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  subdivision_name TEXT,                  -- neighborhood/community

  -- Property details
  property_type TEXT,                     -- 'Residential Lease'
  property_sub_type TEXT,                 -- SFR, Condo, TH, Duplex, etc.
  bedrooms INTEGER,
  bathrooms NUMERIC(4,2),
  living_area NUMERIC(10,2),             -- sqft
  lot_size NUMERIC(10,2),
  year_built INTEGER,
  stories INTEGER,

  -- Pricing (the key data)
  list_price NUMERIC(12,2),              -- asking rent
  close_price NUMERIC(12,2),             -- actual leased price (Closed only)
  original_list_price NUMERIC(12,2),
  previous_list_price NUMERIC(12,2),

  -- Dates
  on_market_date DATE,
  close_date DATE,
  days_on_market INTEGER,

  -- Community / Features
  association_yn BOOLEAN,
  association_fee NUMERIC(10,2),
  community_features JSONB DEFAULT '[]',
  pets_allowed BOOLEAN,
  furnished BOOLEAN,
  pool BOOLEAN,
  waterfront BOOLEAN,
  parking_spaces INTEGER,
  lease_term TEXT,

  -- Agent (for source credibility)
  listing_agent_name TEXT,
  listing_office_name TEXT,

  -- Sync metadata
  modification_timestamp TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rr_comps_county ON rr_rental_comps(county);
CREATE INDEX idx_rr_comps_city ON rr_rental_comps(city);
CREATE INDEX idx_rr_comps_zip ON rr_rental_comps(postal_code);
CREATE INDEX idx_rr_comps_status ON rr_rental_comps(standard_status);
CREATE INDEX idx_rr_comps_sub_type ON rr_rental_comps(property_sub_type);
CREATE INDEX idx_rr_comps_beds ON rr_rental_comps(bedrooms);
CREATE INDEX idx_rr_comps_close_date ON rr_rental_comps(close_date DESC);
CREATE INDEX idx_rr_comps_location ON rr_rental_comps(latitude, longitude);

-- RLS: service role writes, admins read
ALTER TABLE rr_rental_comps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read rr_rental_comps"
  ON rr_rental_comps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================

-- Rent range reports
CREATE TABLE IF NOT EXISTS rent_range_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Subject property
  property_address TEXT NOT NULL,
  city TEXT,
  county TEXT,
  state TEXT DEFAULT 'FL',
  zip TEXT,
  property_details JSONB DEFAULT '{}',   -- beds, baths, sqft, year, type, sub_type, hoa, gated, etc.

  -- Analysis results
  mls_comps JSONB DEFAULT '[]',          -- array of scored MLS comps
  web_comps JSONB DEFAULT '[]',          -- array of scored web comps
  market_data JSONB DEFAULT '{}',        -- trends, vacancy, drivers
  rent_range JSONB DEFAULT '{}',         -- { low, target, high, confidence, trend }
  scoring_weights JSONB DEFAULT '{"mls_weight": 70, "web_weight": 30}',

  -- Sources / citations
  sources JSONB DEFAULT '[]',            -- { url, title, quality_score, type }

  -- Report outputs
  report_html TEXT,                      -- dashboard-formatted HTML
  branded_reports JSONB DEFAULT '{}',    -- { padmagnet: html, sfrm: html }

  -- Methodology snapshot (weights/formulas used for this report)
  methodology JSONB DEFAULT '{}',

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'generating',  -- generating, complete, archived
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_rr_reports_status ON rent_range_reports(status);
CREATE INDEX idx_rr_reports_created_at ON rent_range_reports(created_at DESC);
CREATE INDEX idx_rr_reports_county ON rent_range_reports(county);

ALTER TABLE rent_range_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rent_range_reports"
  ON rent_range_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
