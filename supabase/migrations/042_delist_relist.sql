-- Store remaining advertising days when owner de-lists their property
-- Used to resume the paid period on re-list without charging again
ALTER TABLE listings ADD COLUMN IF NOT EXISTS days_remaining_at_delist integer;
