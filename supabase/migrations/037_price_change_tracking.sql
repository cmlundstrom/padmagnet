-- Track MLS price changes for tenant visibility
-- previous_list_price: stores the price before the most recent change
-- price_changed_at: timestamp of the most recent price change

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS previous_list_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS price_changed_at timestamptz;

-- Index for querying recent price drops (used by PadScore bonus)
CREATE INDEX IF NOT EXISTS idx_listings_price_changed_at
  ON listings (price_changed_at)
  WHERE price_changed_at IS NOT NULL;

-- Trigger: automatically track price changes on UPDATE
-- When list_price changes, store the old price and timestamp
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.list_price IS NOT NULL
     AND NEW.list_price IS DISTINCT FROM OLD.list_price THEN
    NEW.previous_list_price := OLD.list_price;
    NEW.price_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_price_change ON listings;
CREATE TRIGGER trg_track_price_change
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION track_price_change();

-- Recreate tenant_active_listings view to include price change columns
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
WHERE (source = 'mls' AND status = 'active' AND is_active = true)
   OR (source = 'owner' AND status = 'active' AND is_active = true AND expires_at > now());

GRANT SELECT ON tenant_active_listings TO authenticated;
