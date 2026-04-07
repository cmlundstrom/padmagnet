-- 056: Add rejected to listings status constraint
-- Admin can reject pending_review listings, which sets status='rejected'.

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'pending_review', 'rejected', 'expired', 'leased', 'archived'));
