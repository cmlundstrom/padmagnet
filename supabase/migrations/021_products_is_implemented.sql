-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 021: Add is_implemented flag to products            ║
-- ║  Tracks whether a product is wired into app code vs just       ║
-- ║  defined in the catalog.                                       ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_implemented boolean DEFAULT false;
