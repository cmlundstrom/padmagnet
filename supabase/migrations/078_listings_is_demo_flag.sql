-- Migration 078: Demo-listing flag
--
-- Adds is_demo BOOLEAN to listings + filters demo rows out of every
-- renter-facing query path. Used for marketing/promo recordings where
-- a fictional listing must be visible to specific demo accounts but
-- NEVER to real renters.
--
-- Two query surfaces filter on this:
--   1. tenant_active_listings view  (renter swipe feed)
--   2. nearby_rentals_search RPC    (renter home grid + owner nearby comps)
--
-- The owner side (their own listings tab, admin dashboard) shows demo
-- listings normally so the demo account can manage/edit them. Only the
-- public discovery paths exclude them.
--
-- Created 2026-05-08 for the Google Play promo video shoot
-- (1827 Riverbend Cove demo property under maverick@padmagnet.com).

-- ── 1. Add column ──────────────────────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- Existing rows default to false (no backfill required since DEFAULT
-- handles them).

-- ── 2. Update tenant_active_listings view ──────────────────────────
-- Mirrors migration 037's definition + adds is_demo = false filter.
-- Both source branches (mls + owner) must filter; an MLS row should
-- never be is_demo=true but defense in depth.
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
WHERE is_demo = false
  AND (
    (source = 'mls' AND status = 'active' AND is_active = true)
    OR
    (source = 'owner' AND status = 'active' AND is_active = true AND expires_at > now())
  );

GRANT SELECT ON tenant_active_listings TO authenticated;

-- ── 3. Update nearby_rentals_search RPC ────────────────────────────
-- Queries listings directly (no view), so needs its own is_demo filter.
-- Mirrors migration 025's signature; only the WHERE clause changes.
--
-- DROP first because the deployed function's return-type signature
-- conflicts with CREATE OR REPLACE FUNCTION (Postgres rejects with
-- 42P13 "cannot change return type of existing function" when
-- OUT-param row type differs even subtly between deployed and new).
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
      l.is_demo = false
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

-- ── 4. Index hint ──────────────────────────────────────────────────
-- The existing idx_listings_lat_lng_active partial index already
-- excludes inactive listings. Demo rows will still be in the index
-- if they're status='active' AND is_active=true, but the WHERE clause
-- filters them out at query time. For low row counts (single-digit
-- demo listings expected), no separate index needed.
