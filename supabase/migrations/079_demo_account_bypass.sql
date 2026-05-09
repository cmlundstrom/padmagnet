-- Migration 079: Demo-account bypass for is_demo filter
--
-- Lets demo accounts (maverick@padmagnet.com, goose@padmagnet.com)
-- see is_demo=true listings on the renter-side surfaces (Home/Swipe
-- + Nearby Listings). The public still never sees them.
--
-- Background: Migration 078 added a hard `is_demo = false` filter to
-- tenant_active_listings + nearby_rentals_search. That correctly hides
-- the marketing/promo listings from real renters but also blanks the
-- feed for the demo accounts themselves when they switch into renter
-- mode. This migration unblocks them without weakening the public gate.

-- ── 1. Flag column on profiles ─────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN NOT NULL DEFAULT false;

UPDATE profiles SET is_demo_account = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('maverick@padmagnet.com', 'goose@padmagnet.com')
);

-- ── 2. Helper: is the current caller a demo account? ──────────────
-- STABLE so Postgres can fold the result per-statement instead of
-- re-checking once per row. SECURITY DEFINER so it can read the flag
-- regardless of profiles RLS.
CREATE OR REPLACE FUNCTION is_demo_caller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_demo_account FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION is_demo_caller() TO authenticated;

-- ── 3. Recreate tenant_active_listings with bypass ────────────────
DROP VIEW IF EXISTS tenant_active_listings;

CREATE VIEW tenant_active_listings WITH (security_invoker = true) AS
SELECT id, listing_key, listing_id, source, owner_user_id,
  street_number, street_name, city, state_or_province, postal_code, county,
  latitude, longitude, property_type, property_sub_type,
  list_price, previous_list_price, price_changed_at,
  bedrooms_total, bathrooms_total, living_area, lot_size_area, year_built,
  lease_term, available_date, pets_allowed, pets_deposit, fenced_yard, furnished,
  hoa_fee, parking_spaces, pool, photos, virtual_tour_url,
  listing_agent_name, listing_office_name, listing_agent_phone, listing_agent_email,
  standard_status, modification_timestamp, mls_disclaimer,
  is_active, featured, created_at, updated_at,
  public_remarks, tenant_contact_instructions, expires_at, status,
  is_boosted, boosted_until, view_count, inquiry_count
FROM listings
WHERE (is_demo = false OR is_demo_caller())
  AND (
    (source = 'mls' AND status = 'active' AND is_active = true)
    OR
    (source = 'owner' AND status = 'active' AND is_active = true AND expires_at > now())
  );

GRANT SELECT ON tenant_active_listings TO authenticated;

-- ── 4. Recreate nearby_rentals_search with bypass ─────────────────
DROP FUNCTION IF EXISTS nearby_rentals_search(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
  INTEGER, INTEGER, INTEGER, INTEGER,
  UUID, INTEGER, INTEGER
);

CREATE FUNCTION nearby_rentals_search(
  subject_lat DOUBLE PRECISION,
  subject_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  filter_beds INTEGER DEFAULT NULL,
  filter_baths INTEGER DEFAULT NULL,
  filter_min_sqft INTEGER DEFAULT NULL,
  filter_max_sqft INTEGER DEFAULT NULL,
  exclude_id UUID DEFAULT NULL,
  result_limit INTEGER DEFAULT 21,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  listing_key TEXT,
  source TEXT,
  street_number TEXT,
  street_name TEXT,
  city TEXT,
  state_or_province TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  list_price NUMERIC,
  bedrooms_total INTEGER,
  bathrooms_total INTEGER,
  living_area NUMERIC,
  days_on_market INTEGER,
  photos JSONB,
  distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  caller_is_demo BOOLEAN := is_demo_caller();
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      l.id,
      l.listing_key,
      l.source,
      l.street_number,
      l.street_name,
      l.city,
      l.state_or_province,
      l.postal_code,
      l.latitude,
      l.longitude,
      l.list_price,
      l.bedrooms_total,
      l.bathrooms_total,
      l.living_area,
      l.days_on_market,
      l.photos,
      3958.8 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(l.latitude - subject_lat) / 2), 2) +
        COS(RADIANS(subject_lat)) * COS(RADIANS(l.latitude)) *
        POWER(SIN(RADIANS(l.longitude - subject_lng) / 2), 2)
      )) AS distance_miles
    FROM listings l
    WHERE
      (l.is_demo = false OR caller_is_demo)
      AND l.status = 'active'
      AND l.is_active = true
      AND l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
      AND l.latitude BETWEEN min_lat AND max_lat
      AND l.longitude BETWEEN min_lng AND max_lng
      AND (exclude_id IS NULL OR l.id != exclude_id)
      AND (filter_beds IS NULL OR l.bedrooms_total = filter_beds)
      AND (filter_baths IS NULL OR l.bathrooms_total >= filter_baths)
      AND (filter_min_sqft IS NULL OR l.living_area >= filter_min_sqft)
      AND (filter_max_sqft IS NULL OR l.living_area <= filter_max_sqft)
  ) sub
  WHERE sub.distance_miles <= radius_miles
  ORDER BY sub.distance_miles ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;
