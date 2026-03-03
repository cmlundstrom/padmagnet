-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 009: Listings table extensions                       ║
-- ║  Adds description, contact instructions, expiration, status,    ║
-- ║  boost, and analytics columns to the listings table.            ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE listings ADD COLUMN IF NOT EXISTS public_remarks text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS tenant_contact_instructions text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
  CHECK (status IN ('draft','active','expired','leased','archived'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS inquiry_count integer DEFAULT 0;

-- Backfill existing listings
UPDATE listings SET status = 'active' WHERE is_active = true AND status IS NULL;
UPDATE listings SET status = 'archived' WHERE is_active = false AND status IS NULL;

-- Indexes for feed queries and boost selection
CREATE INDEX idx_listings_status_expires ON listings(status, expires_at) WHERE status = 'active';
CREATE INDEX idx_listings_boosted ON listings(is_boosted, boosted_until) WHERE is_boosted = true;
