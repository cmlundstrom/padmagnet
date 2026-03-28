-- ============================================================
-- Ask Pad + Renter Tiers
-- Separate from owner tiers (profiles.tier column untouched)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS renter_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_renter BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_zones_count INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_queries_today INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_queries_rollover INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_queries_reset_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_abuse_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_cooldown_until TIMESTAMPTZ;
