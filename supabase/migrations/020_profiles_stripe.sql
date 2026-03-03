-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 020: Profiles — Stripe customer ID                   ║
-- ║  Adds stripe_customer_id for saved payment methods.             ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
