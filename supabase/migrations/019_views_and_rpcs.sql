-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 019: Views + RPCs                                    ║
-- ║  tenant_active_listings view, boost selection + position RPCs.  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- View: active listings for tenant feed
-- MLS listings: active + is_active (Bridge sync controls lifecycle)
-- Owner listings: active + not expired (30-day clock from payment)
CREATE OR REPLACE VIEW tenant_active_listings AS
SELECT * FROM listings
WHERE (
  (source = 'mls' AND status = 'active' AND is_active = true)
  OR
  (source = 'owner' AND status = 'active' AND expires_at > now())
);

-- RPC: select exactly 1 boosted listing using fairness hash
-- The md5 hash of tenant_id + listing_id ensures:
--   - Same tenant sees same boost on repeated loads (deterministic)
--   - Different tenants see different boosts (fair rotation)
CREATE OR REPLACE FUNCTION select_boosted_listing(p_tenant_id uuid)
RETURNS uuid AS $$
  SELECT id
  FROM tenant_active_listings
  WHERE is_boosted = true
    AND boosted_until > now()
  ORDER BY md5(p_tenant_id::text || id::text)
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- RPC: deterministic boost position (0-4) in top-5 slots
CREATE OR REPLACE FUNCTION get_boost_position(p_tenant_id uuid)
RETURNS integer AS $$
  SELECT abs(('x' || left(md5(p_tenant_id::text || 'boost_pos'), 8))::bit(32)::integer) % 5;
$$ LANGUAGE sql IMMUTABLE;
