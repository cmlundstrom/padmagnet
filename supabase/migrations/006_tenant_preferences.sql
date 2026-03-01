-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 006: Tenant preferences                               ║
-- ║  Stores each user's matching preferences for PadScore            ║
-- ║  calculation. One row per user.                                  ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS tenant_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Budget
  budget_min numeric(10,2) DEFAULT 0,
  budget_max numeric(10,2) DEFAULT 5000,

  -- Property requirements
  beds_min integer DEFAULT 0,
  baths_min numeric(4,2) DEFAULT 1,
  property_types text[] DEFAULT '{}',

  -- Location
  center_lat double precision,
  center_lng double precision,
  radius_miles numeric(6,2) DEFAULT 15,
  preferred_cities text[] DEFAULT '{}',

  -- Features
  pets_required boolean DEFAULT false,
  pet_type text,                            -- 'dog', 'cat', 'both'
  fenced_yard_required boolean DEFAULT false,
  furnished_preferred boolean,              -- null = no preference
  min_lease_months integer,
  max_hoa numeric(10,2),

  -- Move-in
  move_in_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_tenant_preferences_updated_at
  BEFORE UPDATE ON tenant_preferences FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE tenant_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON tenant_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
