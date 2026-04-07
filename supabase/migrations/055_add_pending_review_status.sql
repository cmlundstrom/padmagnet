-- 055: Add pending_review to listings status constraint
-- The API route sets status='pending_review' when owners submit for activation,
-- but the original constraint only allowed: draft, active, expired, leased, archived.

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'pending_review', 'expired', 'leased', 'archived'));
