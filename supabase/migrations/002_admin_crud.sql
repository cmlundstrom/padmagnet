-- ============================================================
-- Migration 002: Admin CRUD toolkit
-- Extends waitlist table + creates audit_log
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Ensure update_updated_at_column() function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Extend waitlist table
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS suppressed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suppressed_reason text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Trigger for updated_at on waitlist
DROP TRIGGER IF EXISTS update_waitlist_updated_at ON waitlist;
CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON waitlist FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  admin_user text DEFAULT 'admin',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_row ON audit_log(table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
