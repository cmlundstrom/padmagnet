-- Global Trash Cleanup — drop orphaned tables, functions, and consolidate triggers
-- All items verified: zero rows, no active code references

-- ============================================================
-- A. DROP ORPHANED TABLES (16 tables, all 0 rows, no code refs)
-- ============================================================
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS landlord_profiles CASCADE;
DROP TABLE IF EXISTS tenant_profiles CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS property_photos CASCADE;
DROP TABLE IF EXISTS idx_sync_logs CASCADE;
DROP TABLE IF EXISTS idx_feeds CASCADE;
DROP TABLE IF EXISTS idx_field_mappings CASCADE;
DROP TABLE IF EXISTS support_threads CASCADE;
DROP TABLE IF EXISTS support_participants CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS app_events CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS showing_requests CASCADE;
DROP TABLE IF EXISTS availability_blocks CASCADE;

-- ============================================================
-- B. DROP ORPHANED FUNCTIONS
-- ============================================================
-- has_admin_role / is_admin referenced admin_users (now dropped)
DROP FUNCTION IF EXISTS has_admin_role(uuid, text);
DROP FUNCTION IF EXISTS is_admin(uuid);
-- update_thread_last_message triggered on support_messages (now dropped)
DROP FUNCTION IF EXISTS update_thread_last_message() CASCADE;

-- ============================================================
-- C. CONSOLIDATE UPDATED_AT TRIGGERS
-- Keep update_updated_at_column(), drop set_updated_at() and update_updated_at()
-- ============================================================
-- Remap products trigger
DROP TRIGGER IF EXISTS set_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Remap padscore_configs trigger
DROP TRIGGER IF EXISTS trg_padscore_configs_updated ON padscore_configs;
CREATE TRIGGER update_padscore_configs_updated_at
  BEFORE UPDATE ON padscore_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers on dropped tables (landlord_profiles, tenant_profiles, properties, idx_feeds)
-- were already removed by CASCADE above

-- Drop the redundant functions
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
