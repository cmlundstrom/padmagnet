-- Migration 022: Display Field Configs
-- Config-driven system for tenant listing detail page rendering

-- 1) New owner-specific columns on listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_special_comments text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_application_link text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_pet_policy_details text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_utilities_included text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_showing_instructions text;

-- 2) Create the display field configs table
CREATE TABLE IF NOT EXISTS display_field_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  output_key text UNIQUE NOT NULL,
  label text NOT NULL,
  section text NOT NULL,
  sort_order int DEFAULT 0,
  visible boolean DEFAULT true,
  canonical_column text NOT NULL,
  render_type text DEFAULT 'text'
    CHECK (render_type IN ('text','stat','boolean','currency','link','autolink','badge','date','number')),
  format_options jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_display_field_configs_updated_at
  BEFORE UPDATE ON display_field_configs FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE display_field_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read display field configs"
  ON display_field_configs FOR SELECT USING (true);
CREATE POLICY "Service role manages display field configs"
  ON display_field_configs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) Seed all ~25 display fields
INSERT INTO display_field_configs
  (output_key, label, section, sort_order, canonical_column, render_type, format_options)
VALUES
  -- hero
  ('public_remarks', 'What You''ll Love', 'hero', 10, 'public_remarks', 'text', '{"collapsible": true, "max_length_preview": 200}'),
  -- stats
  ('bedrooms_total', 'Beds', 'stats', 20, 'bedrooms_total', 'stat', '{"studio_if_zero": true}'),
  ('bathrooms_total', 'Baths', 'stats', 21, 'bathrooms_total', 'stat', '{}'),
  ('living_area', 'Sqft', 'stats', 22, 'living_area', 'number', '{}'),
  ('year_built', 'Year Built', 'stats', 23, 'year_built', 'stat', '{}'),
  -- features
  ('property_sub_type', 'Property Type', 'features', 30, 'property_sub_type', 'text', '{}'),
  ('lease_term', 'Lease Term', 'features', 31, 'lease_term', 'text', '{"suffix": " months"}'),
  ('pets_allowed', 'Pets', 'features', 32, 'pets_allowed', 'boolean', '{"true_text": "Allowed", "false_text": "Not Allowed"}'),
  ('owner_pet_policy_details', 'Pet Policy Details', 'features', 33, 'owner_pet_policy_details', 'text', '{}'),
  ('furnished', 'Furnished', 'features', 34, 'furnished', 'boolean', '{"true_text": "Yes", "false_text": "No"}'),
  ('hoa_fee', 'HOA/Association', 'features', 35, 'hoa_fee', 'currency', '{"suffix": "/mo"}'),
  ('fenced_yard', 'Fenced Yard', 'features', 36, 'fenced_yard', 'boolean', '{"true_text": "Yes", "false_text": "No"}'),
  ('pool', 'Pool', 'features', 37, 'pool', 'boolean', '{"true_text": "Yes", "false_text": "No"}'),
  ('parking_spaces', 'Parking', 'features', 38, 'parking_spaces', 'number', '{"suffix": " spaces"}'),
  ('lot_size_area', 'Lot Size', 'features', 39, 'lot_size_area', 'number', '{"suffix": " sqft"}'),
  ('available_date', 'Available', 'features', 40, 'available_date', 'date', '{}'),
  ('owner_utilities_included', 'Utilities Included', 'features', 41, 'owner_utilities_included', 'text', '{}'),
  ('virtual_tour_url', 'Virtual Tour', 'features', 42, 'virtual_tour_url', 'link', '{}'),
  -- contact
  ('tenant_contact_instructions', 'Contact Instructions', 'contact', 50, 'tenant_contact_instructions', 'autolink', '{}'),
  ('owner_special_comments', 'Special Notes / Move-In Perks', 'contact', 51, 'owner_special_comments', 'text', '{"collapsible": true}'),
  ('owner_application_link', 'Application Link', 'contact', 52, 'owner_application_link', 'link', '{}'),
  ('owner_showing_instructions', 'Showing Instructions', 'contact', 53, 'owner_showing_instructions', 'text', '{}'),
  -- agent
  ('listing_agent_name', 'Listing Agent', 'agent', 60, 'listing_agent_name', 'text', '{"label_by_source": {"mls": "Listing Agent", "owner": "Property Owner"}}'),
  ('listing_agent_phone', 'Agent Phone', 'agent', 61, 'listing_agent_phone', 'text', '{"label_by_source": {"mls": "Agent Phone", "owner": "Owner Phone"}}'),
  ('listing_agent_email', 'Agent Email', 'agent', 62, 'listing_agent_email', 'text', '{"label_by_source": {"mls": "Agent Email", "owner": "Owner Email"}}'),
  ('listing_office_name', 'Listing Office', 'agent', 63, 'listing_office_name', 'text', '{}');
