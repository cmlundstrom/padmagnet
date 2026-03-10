-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 028: Add association_preferred to tenant_preferences ║
-- ║  Fixes missing column — preference was saving to AsyncStorage   ║
-- ║  but silently dropped by Supabase on API upsert.               ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE tenant_preferences
  ADD COLUMN IF NOT EXISTS association_preferred boolean DEFAULT NULL;

COMMENT ON COLUMN tenant_preferences.association_preferred IS 'Tenant HOA/COA preference: true=prefer, false=avoid, null=no preference. Used by PadScore (50pt penalty when false + listing has HOA).';
