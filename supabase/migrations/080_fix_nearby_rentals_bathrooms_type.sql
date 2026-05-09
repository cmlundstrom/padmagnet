-- Migration 080: Fix nearby_rentals_search RETURNS TABLE type for bathrooms_total
--
-- Bug introduced in migration 078 (and propagated through 079): the RPC
-- declared `bathrooms_total INTEGER` in its RETURNS TABLE, but the actual
-- listings.bathrooms_total column is numeric(4,2) (so 1.5/2.5 baths can
-- exist). Postgres rejects with 42804 on every call:
--   "Returned type numeric(4,2) does not match expected type integer in
--    column 13"
-- The API route (/api/owner/nearby-rentals) catches this as a 500, so the
-- owner-home grid + Nearby Rentals studio panel shipped today (2026-05-08)
-- both render the empty "No rentals found nearby" state regardless of
-- input.
--
-- Fix: drop and recreate with bathrooms_total NUMERIC. All other return
-- types match the underlying columns (verified against information_schema
-- on 2026-05-08). Demo-account bypass from migration 079 preserved.

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
  bathrooms_total NUMERIC,
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
