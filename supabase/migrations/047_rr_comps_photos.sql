-- Add photos column to rr_rental_comps for comp detail display
ALTER TABLE rr_rental_comps ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
