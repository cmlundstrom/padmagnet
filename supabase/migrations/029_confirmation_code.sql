-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 029: Add confirmation_code column to listings       ║
-- ║  Human-readable reference code for owner-submitted listings    ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE listings ADD COLUMN IF NOT EXISTS confirmation_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_confirmation_code
  ON listings (confirmation_code) WHERE confirmation_code IS NOT NULL;
