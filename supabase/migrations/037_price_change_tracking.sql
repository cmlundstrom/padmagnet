-- Track MLS price changes for tenant visibility
-- previous_list_price: stores the price before the most recent change
-- price_changed_at: timestamp of the most recent price change

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS previous_list_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS price_changed_at timestamptz;

-- Index for querying recent price drops (used by PadScore bonus)
CREATE INDEX IF NOT EXISTS idx_listings_price_changed_at
  ON listings (price_changed_at)
  WHERE price_changed_at IS NOT NULL;

-- Trigger: automatically track price changes on UPDATE
-- When list_price changes, store the old price and timestamp
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.list_price IS NOT NULL
     AND NEW.list_price IS DISTINCT FROM OLD.list_price THEN
    NEW.previous_list_price := OLD.list_price;
    NEW.price_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_price_change ON listings;
CREATE TRIGGER trg_track_price_change
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION track_price_change();
