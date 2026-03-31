-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 052: Widen billing constraints for renter tiers     ║
-- ║  Enables payments + ledger_entries tracking for renter tier     ║
-- ║  purchases (explorer/master). Previously silently failing due  ║
-- ║  to CHECK constraints only allowing owner payment types.       ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Widen payments.purchase_type to include tier_pass and renter_tier
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_purchase_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_purchase_type_check
  CHECK (purchase_type IN ('listing','boost','management','photography','subscription','tier_pass','renter_tier'));

-- Widen ledger_entries.reference_type to include renter tier types
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_reference_type_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_reference_type_check
  CHECK (reference_type IN ('owner_purchase','subscription','manual','tier_pass','tier_upgrade_credit','renter_tier','renter_tier_refund','padpoints_gift'));

-- Index for filtering payments by type (admin queries)
CREATE INDEX IF NOT EXISTS idx_payments_purchase_type ON payments(purchase_type);
