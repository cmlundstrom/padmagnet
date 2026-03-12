-- Step 8: Fix tenant_active_listings view
-- 1. Add security_invoker = true (respects caller's RLS, no longer bypasses as postgres)
-- 2. Add is_active = true to owner branch (was missing — owner listings with is_active=false could appear)
-- 3. Revoke all except SELECT from anon/authenticated (view had full INSERT/UPDATE/DELETE permissions)

CREATE OR REPLACE VIEW tenant_active_listings
WITH (security_invoker = true) AS
SELECT
  id, listing_key, listing_id, source, owner_user_id,
  street_number, street_name, city, state_or_province, postal_code, county,
  latitude, longitude, property_type, property_sub_type,
  list_price, bedrooms_total, bathrooms_total, living_area, lot_size_area,
  year_built, lease_term, available_date,
  pets_allowed, pets_deposit, fenced_yard, furnished, hoa_fee, parking_spaces, pool,
  photos, virtual_tour_url,
  listing_agent_name, listing_office_name, listing_agent_phone, listing_agent_email,
  standard_status, modification_timestamp, mls_disclaimer,
  is_active, featured, created_at, updated_at,
  public_remarks, tenant_contact_instructions,
  expires_at, status, is_boosted, boosted_until, view_count, inquiry_count
FROM listings
WHERE
  (source = 'mls' AND status = 'active' AND is_active = true)
  OR
  (source = 'owner' AND status = 'active' AND is_active = true AND expires_at > now());

-- Lock down permissions: SELECT only for public roles
REVOKE ALL ON tenant_active_listings FROM anon, authenticated;
GRANT SELECT ON tenant_active_listings TO anon, authenticated;
