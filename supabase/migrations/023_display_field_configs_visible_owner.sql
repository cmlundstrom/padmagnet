-- Add visible_owner column to display_field_configs
-- Controls whether a field is visible on owner-created listings (separate from MLS visibility)
ALTER TABLE display_field_configs ADD COLUMN IF NOT EXISTS visible_owner boolean NOT NULL DEFAULT true;
