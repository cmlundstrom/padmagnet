-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 071: profiles.archived_at                             ║
-- ║  Archive-first data model. Users are archived by default rather  ║
-- ║  than hard-deleted, so returning owners can re-list their old    ║
-- ║  properties with minimum friction. Hard delete stays available   ║
-- ║  for super_admins (testing cleanup + legal deletion requests).   ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Partial index to speed default "active only" admin queries.
CREATE INDEX IF NOT EXISTS idx_profiles_active
  ON profiles(id)
  WHERE archived_at IS NULL;
