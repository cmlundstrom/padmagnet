-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 010: Listing field configs                           ║
-- ║  Metadata table that controls which existing DB columns are     ║
-- ║  shown/required in owner forms and tenant cards. Does NOT       ║
-- ║  store listing data — only UI/validation configuration.         ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS listing_field_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key text UNIQUE NOT NULL,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('text','number','boolean','select','date','textarea')),
  required_for_owner boolean DEFAULT false,
  displayed_on_card boolean DEFAULT false,
  visible_to_tenants boolean DEFAULT true,
  section text,
  sort_order integer DEFAULT 0,
  is_core_match_field boolean DEFAULT false,
  select_options jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO listing_field_configs (field_key, label, type, required_for_owner, displayed_on_card, visible_to_tenants, section, sort_order, is_core_match_field) VALUES
  ('street_number','Street Number','text',false,true,true,'address',1,false),
  ('street_name','Street Name','text',true,true,true,'address',2,false),
  ('city','City','text',true,true,true,'address',3,true),
  ('postal_code','Zip Code','text',false,true,true,'address',4,false),
  ('list_price','Monthly Rent','number',true,true,true,'details',10,true),
  ('property_sub_type','Property Type','select',false,true,true,'details',11,true),
  ('bedrooms_total','Bedrooms','number',false,true,true,'details',12,true),
  ('bathrooms_total','Bathrooms','number',false,true,true,'details',13,true),
  ('living_area','Square Feet','number',false,true,true,'details',14,false),
  ('year_built','Year Built','number',false,true,true,'details',15,false),
  ('public_remarks','Description','textarea',false,true,true,'details',16,false),
  ('lease_term','Lease Term (months)','number',false,true,true,'lease',20,false),
  ('available_date','Available Date','date',false,true,true,'lease',21,false),
  ('hoa_fee','HOA Fee ($/mo)','number',false,true,true,'lease',22,false),
  ('parking_spaces','Parking Spaces','number',false,false,true,'features',30,false),
  ('pets_allowed','Pets Allowed','boolean',false,true,true,'features',31,true),
  ('pets_deposit','Pet Deposit','number',false,false,true,'features',32,false),
  ('fenced_yard','Fenced Yard','boolean',false,true,true,'features',33,false),
  ('furnished','Furnished','boolean',false,true,true,'features',34,false),
  ('pool','Pool','boolean',false,false,true,'features',35,false),
  ('virtual_tour_url','Virtual Tour URL','text',false,false,true,'media',40,false),
  ('tenant_contact_instructions','Contact Instructions','textarea',false,true,true,'contact',50,false),
  ('listing_agent_name','Listing Agent Name','text',false,true,true,'contact',51,false),
  ('listing_agent_phone','Listing Agent Phone','text',false,true,true,'contact',52,false),
  ('listing_agent_email','Listing Agent Email','text',false,true,true,'contact',53,false);

-- RLS
ALTER TABLE listing_field_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read field configs" ON listing_field_configs FOR SELECT USING (true);
CREATE POLICY "Service role manages field configs" ON listing_field_configs FOR ALL TO service_role USING (true) WITH CHECK (true);
