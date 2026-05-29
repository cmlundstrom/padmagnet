-- ============================================================
-- Migration 083: Archive waitlist table
-- Public waitlist form removed from homepage when app went live on
-- Google Play. Existing signups are preserved by renaming the table;
-- the orphaned tickets FK is dropped so the schema is no longer
-- coupled to a table the app no longer reads from.
--
-- Reversible: rename waitlist_archive → waitlist and recreate the FK
-- if a waitlist surface is ever brought back.
-- ============================================================

-- 1. Drop the FK from tickets. The waitlist_id column itself is kept
--    so any historical ticket rows that reference an archived signup
--    retain their pointer (now orphaned, but auditable).
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_waitlist_id_fkey;

-- 2. Drop the updated_at trigger before the rename so we don't carry a
--    name that no longer matches its table.
DROP TRIGGER IF EXISTS update_waitlist_updated_at ON waitlist;

-- 3. Rename the table so any future query against `waitlist` will fail
--    loudly (rather than silently writing to a dead table).
ALTER TABLE IF EXISTS waitlist RENAME TO waitlist_archive;

-- 4. Document the archival on the table itself.
COMMENT ON TABLE waitlist_archive IS
  'Archived 2026-05-28 — public waitlist removed when app launched on Google Play. Data preserved for reference; no active code reads or writes this table.';
