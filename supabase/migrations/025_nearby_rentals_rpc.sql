-- Migration 025: Nearby Rentals Search RPC function
-- Haversine distance query with bounding-box pre-filter for performance.
-- Called by /api/owner/nearby-rentals

CREATE OR REPLACE FUNCTION nearby_rentals_search(
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
      -- Haversine formula (miles)
      3958.8 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(l.latitude - subject_lat) / 2), 2) +
        COS(RADIANS(subject_lat)) * COS(RADIANS(l.latitude)) *
        POWER(SIN(RADIANS(l.longitude - subject_lng) / 2), 2)
      )) AS distance_miles
    FROM listings l
    WHERE
      l.status = 'active'
      AND l.is_active = true
      AND l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
      -- Bounding box pre-filter (index-friendly)
      AND l.latitude BETWEEN min_lat AND max_lat
      AND l.longitude BETWEEN min_lng AND max_lng
      -- Exclude subject property
      AND (exclude_id IS NULL OR l.id != exclude_id)
      -- Optional filters
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

-- Index to speed up bounding-box pre-filter
CREATE INDEX IF NOT EXISTS idx_listings_lat_lng_active
  ON listings(latitude, longitude)
  WHERE status = 'active' AND is_active = true AND latitude IS NOT NULL AND longitude IS NOT NULL;
