-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 013: Unified billing tables                          ║
-- ║  Fresh design: subscriptions, invoices, payments, ledger,       ║
-- ║  owner_purchases. All have product_id/listing_id/purchase_type. ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Subscriptions (for future recurring products)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  listing_id uuid REFERENCES listings(id),
  stripe_subscription_id text,
  stripe_customer_id text,
  status text DEFAULT 'active' CHECK (status IN ('active','past_due','cancelled','trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id) NOT NULL,
  product_id uuid REFERENCES products(id),
  listing_id uuid REFERENCES listings(id),
  subscription_id uuid REFERENCES subscriptions(id),
  stripe_invoice_id text,
  amount_cents integer NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('draft','open','paid','void','uncollectible')),
  purchase_type text CHECK (purchase_type IN ('listing','boost','management','photography','subscription')),
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id) NOT NULL,
  invoice_id uuid REFERENCES invoices(id),
  product_id uuid REFERENCES products(id),
  listing_id uuid REFERENCES listings(id),
  stripe_payment_intent_id text,
  amount_cents integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','refunded')),
  purchase_type text CHECK (purchase_type IN ('listing','boost','management','photography','subscription')),
  method text,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- Ledger entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id),
  invoice_id uuid REFERENCES invoices(id),
  payment_id uuid REFERENCES payments(id),
  product_id uuid REFERENCES products(id),
  listing_id uuid REFERENCES listings(id),
  entry_type text NOT NULL CHECK (entry_type IN ('revenue','refund','fee','payout','credit')),
  reference_type text CHECK (reference_type IN ('owner_purchase','subscription','manual')),
  amount_cents integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Owner purchases (thin join/log table)
CREATE TABLE IF NOT EXISTS owner_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  listing_id uuid REFERENCES listings(id),
  invoice_id uuid REFERENCES invoices(id),
  stripe_checkout_session_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoices_owner ON invoices(owner_user_id);
CREATE INDEX idx_payments_owner ON payments(owner_user_id);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX idx_purchases_owner ON owner_purchases(owner_user_id);
CREATE INDEX idx_purchases_listing ON owner_purchases(listing_id);
CREATE INDEX idx_ledger_owner ON ledger_entries(owner_user_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own subscriptions" ON subscriptions FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Owners read own invoices" ON invoices FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Owners read own payments" ON payments FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Owners read own ledger" ON ledger_entries FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Owners read own purchases" ON owner_purchases FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Service role manages subscriptions" ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages invoices" ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages ledger" ON ledger_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages purchases" ON owner_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
