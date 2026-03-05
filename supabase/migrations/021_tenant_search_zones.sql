-- Migration 021: tenant_search_zones table
-- Replaces broken center_lat/center_lng/radius_miles on tenant_preferences
-- Supports 1-3 search zones per tenant for multi-area search

CREATE TABLE tenant_search_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,                        -- "Stuart area", "Miami, FL"
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  radius_miles numeric(6,2) DEFAULT 15 NOT NULL,
  position integer DEFAULT 0 NOT NULL,        -- display ordering (0, 1, 2)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_search_zones_updated_at
  BEFORE UPDATE ON tenant_search_zones FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tenant_search_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own zones"
  ON tenant_search_zones FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Max 3 zones enforced in API, not DB constraint (friendlier error messages)
CREATE INDEX idx_search_zones_user ON tenant_search_zones(user_id);
