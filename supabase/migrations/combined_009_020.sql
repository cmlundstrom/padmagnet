-- ============================================
-- PadMagnet Migrations 009-020 (Combined)
-- Run in Supabase SQL Editor
-- ============================================


-- ============================================
-- 009_listing_extensions.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 009: Listings table extensions                       ║
-- ║  Adds description, contact instructions, expiration, status,    ║
-- ║  boost, and analytics columns to the listings table.            ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE listings ADD COLUMN IF NOT EXISTS public_remarks text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS tenant_contact_instructions text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
  CHECK (status IN ('draft','active','expired','leased','archived'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS inquiry_count integer DEFAULT 0;

-- Backfill existing listings
UPDATE listings SET status = 'active' WHERE is_active = true AND status IS NULL;
UPDATE listings SET status = 'archived' WHERE is_active = false AND status IS NULL;

-- Indexes for feed queries and boost selection
CREATE INDEX idx_listings_status_expires ON listings(status, expires_at) WHERE status = 'active';
CREATE INDEX idx_listings_boosted ON listings(is_boosted, boosted_until) WHERE is_boosted = true;


-- ============================================
-- 010_listing_field_configs.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 010: Listing field configs                           ║
-- ║  Metadata table that controls which existing DB columns are     ║
-- ║  shown/required in owner forms and tenant cards. Does NOT       ║
-- ║  store listing data — only UI/validation configuration.         ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS listing_field_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key text UNIQUE NOT NULL,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('text','number','boolean','select','date','textarea')),
  required_for_owner boolean DEFAULT false,
  displayed_on_card boolean DEFAULT false,
  visible_to_tenants boolean DEFAULT true,
  section text,
  sort_order integer DEFAULT 0,
  is_core_match_field boolean DEFAULT false,
  select_options jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO listing_field_configs (field_key, label, type, required_for_owner, displayed_on_card, visible_to_tenants, section, sort_order, is_core_match_field) VALUES
  ('street_number','Street Number','text',false,true,true,'address',1,false),
  ('street_name','Street Name','text',true,true,true,'address',2,false),
  ('city','City','text',true,true,true,'address',3,true),
  ('postal_code','Zip Code','text',false,true,true,'address',4,false),
  ('list_price','Monthly Rent','number',true,true,true,'details',10,true),
  ('property_sub_type','Property Type','select',false,true,true,'details',11,true),
  ('bedrooms_total','Bedrooms','number',false,true,true,'details',12,true),
  ('bathrooms_total','Bathrooms','number',false,true,true,'details',13,true),
  ('living_area','Square Feet','number',false,true,true,'details',14,false),
  ('year_built','Year Built','number',false,true,true,'details',15,false),
  ('public_remarks','Description','textarea',false,true,true,'details',16,false),
  ('lease_term','Lease Term (months)','number',false,true,true,'lease',20,false),
  ('available_date','Available Date','date',false,true,true,'lease',21,false),
  ('hoa_fee','HOA Fee ($/mo)','number',false,true,true,'lease',22,false),
  ('parking_spaces','Parking Spaces','number',false,false,true,'features',30,false),
  ('pets_allowed','Pets Allowed','boolean',false,true,true,'features',31,true),
  ('pets_deposit','Pet Deposit','number',false,false,true,'features',32,false),
  ('fenced_yard','Fenced Yard','boolean',false,true,true,'features',33,false),
  ('furnished','Furnished','boolean',false,true,true,'features',34,false),
  ('pool','Pool','boolean',false,false,true,'features',35,false),
  ('virtual_tour_url','Virtual Tour URL','text',false,false,true,'media',40,false),
  ('tenant_contact_instructions','Contact Instructions','textarea',false,true,true,'contact',50,false),
  ('listing_agent_name','Listing Agent Name','text',false,true,true,'contact',51,false),
  ('listing_agent_phone','Listing Agent Phone','text',false,true,true,'contact',52,false),
  ('listing_agent_email','Listing Agent Email','text',false,true,true,'contact',53,false);

-- RLS
ALTER TABLE listing_field_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read field configs" ON listing_field_configs FOR SELECT USING (true);
CREATE POLICY "Service role manages field configs" ON listing_field_configs FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 011_products.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 011: Products table                                  ║
-- ║  Admin-editable product catalog for listing fees, boosts, etc.  ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  type text NOT NULL CHECK (type IN ('one_time','recurring')),
  recurring_interval text CHECK (recurring_interval IN ('month','year')),
  stripe_price_id text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default products
INSERT INTO products (name, description, price_cents, type, sort_order) VALUES
  ('Basic 30-Day Listing', 'Your property listed on PadMagnet for 30 days with PadScore matching.', 2999, 'one_time', 1),
  ('Boosted Placement', 'Priority placement in tenant feeds for 30 days.', 1499, 'one_time', 2);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Service role manages products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 012_email_templates.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 012: Email templates                                 ║
-- ║  Admin-editable transactional email templates with variable     ║
-- ║  interpolation. Used by Resend for all automated emails.        ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO email_templates (slug, subject, variables) VALUES
  ('payment_confirmation','Your listing is live on PadMagnet!','["owner_name","listing_address","expires_at","receipt_url"]'),
  ('expiry_7day','Your listing expires in 7 days','["owner_name","listing_address","expires_at","renew_url"]'),
  ('expiry_3day','Your listing expires in 3 days','["owner_name","listing_address","expires_at","renew_url"]'),
  ('expiry_1day','Last day! Your listing expires tomorrow','["owner_name","listing_address","expires_at","renew_url"]'),
  ('listing_expired','Your listing has expired','["owner_name","listing_address","renew_url"]'),
  ('inquiry_alert','New inquiry on your listing','["owner_name","listing_address","tenant_name","message_preview","inbox_url"]'),
  ('receipt','PadMagnet Payment Receipt','["owner_name","amount","description","date","receipt_url"]'),
  ('showing_confirmed','Tour confirmed for {{listing_address}}','["tenant_name","listing_address","date_time","owner_name"]'),
  ('document_sent','New document from your landlord','["tenant_name","listing_address","document_name","view_url"]');

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages email templates" ON email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 013_billing.sql
-- ============================================
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


-- ============================================
-- 014_storage_buckets.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 014: Supabase Storage buckets                        ║
-- ║  listing-photos (public) and documents (private).               ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Listing photos bucket (public — images served directly)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing-photos', 'listing-photos', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public read listing photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');
CREATE POLICY "Users delete own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Documents bucket (private — signed URLs for access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own or sent docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "Users delete own docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================
-- 015_messaging_multichannel.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 015: Messaging multichannel                          ║
-- ║  Extends conversations/messages for Twilio SMS + email.         ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS primary_channel text DEFAULT 'in_app'
  CHECK (primary_channel IN ('in_app','sms','email'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS twilio_conversation_sid text;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel text DEFAULT 'in_app'
  CHECK (channel IN ('in_app','sms','email'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'delivered'
  CHECK (delivery_status IN ('pending','sent','delivered','failed'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_phone text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_phone text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_email text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_email text;


-- ============================================
-- 016_calendar_availability.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 016: Calendar / availability                         ║
-- ║  Recurring availability blocks + one-off showing requests.      ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES listings(id) NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT has_day_or_date CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS showing_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_user_id uuid REFERENCES auth.users(id) NOT NULL,
  listing_id uuid REFERENCES listings(id) NOT NULL,
  requested_slot timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','cancelled')),
  notes text,
  owner_response_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_availability_listing ON availability_blocks(listing_id);
CREATE INDEX idx_showings_listing ON showing_requests(listing_id);
CREATE INDEX idx_showings_tenant ON showing_requests(tenant_user_id);

-- RLS
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE showing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own availability" ON availability_blocks FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Anyone reads availability" ON availability_blocks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tenants create showing requests" ON showing_requests FOR INSERT TO authenticated
  WITH CHECK (tenant_user_id = auth.uid());
CREATE POLICY "Users read own showings" ON showing_requests FOR SELECT TO authenticated
  USING (tenant_user_id = auth.uid() OR listing_id IN (SELECT id FROM listings WHERE owner_user_id = auth.uid()));
CREATE POLICY "Owners update showings on own listings" ON showing_requests FOR UPDATE TO authenticated
  USING (listing_id IN (SELECT id FROM listings WHERE owner_user_id = auth.uid()));


-- ============================================
-- 017_documents.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 017: Documents table                                 ║
-- ║  Lease agreements and disclosures uploaded to Supabase Storage. ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id) NOT NULL,
  listing_id uuid REFERENCES listings(id),
  type text DEFAULT 'lease' CHECK (type IN ('lease','addendum','disclosure','other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','signed')),
  sent_to_user_id uuid REFERENCES auth.users(id),
  sent_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_documents_owner ON documents(owner_user_id);
CREATE INDEX idx_documents_listing ON documents(listing_id);
CREATE INDEX idx_documents_recipient ON documents(sent_to_user_id);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own documents" ON documents FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Recipients read sent documents" ON documents FOR SELECT TO authenticated
  USING (sent_to_user_id = auth.uid() AND status IN ('sent','viewed','signed'));
CREATE POLICY "Service role manages documents" ON documents FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 018_sync_logs.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 018: Sync logs                                       ║
-- ║  Structured logging for IDX feed syncs. Powers admin overview   ║
-- ║  feed health dashboard.                                         ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_name text DEFAULT 'bridge',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text CHECK (status IN ('running','success','partial','failed')),
  listings_added integer DEFAULT 0,
  listings_updated integer DEFAULT 0,
  listings_deactivated integer DEFAULT 0,
  listings_skipped integer DEFAULT 0,
  duration_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sync_logs_feed ON sync_logs(feed_name, created_at DESC);

-- RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages sync logs" ON sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 019_views_and_rpcs.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 019: Views + RPCs                                    ║
-- ║  tenant_active_listings view, boost selection + position RPCs.  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- View: active listings for tenant feed
-- MLS listings: active + is_active (Bridge sync controls lifecycle)
-- Owner listings: active + not expired (30-day clock from payment)
CREATE OR REPLACE VIEW tenant_active_listings AS
SELECT * FROM listings
WHERE (
  (source = 'mls' AND status = 'active' AND is_active = true)
  OR
  (source = 'owner' AND status = 'active' AND expires_at > now())
);

-- RPC: select exactly 1 boosted listing using fairness hash
-- The md5 hash of tenant_id + listing_id ensures:
--   - Same tenant sees same boost on repeated loads (deterministic)
--   - Different tenants see different boosts (fair rotation)
CREATE OR REPLACE FUNCTION select_boosted_listing(p_tenant_id uuid)
RETURNS uuid AS $$
  SELECT id
  FROM tenant_active_listings
  WHERE is_boosted = true
    AND boosted_until > now()
  ORDER BY md5(p_tenant_id::text || id::text)
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- RPC: deterministic boost position (0-4) in top-5 slots
CREATE OR REPLACE FUNCTION get_boost_position(p_tenant_id uuid)
RETURNS integer AS $$
  SELECT abs(('x' || left(md5(p_tenant_id::text || 'boost_pos'), 8))::bit(32)::integer) % 5;
$$ LANGUAGE sql IMMUTABLE;


-- ============================================
-- 020_profiles_stripe.sql
-- ============================================
-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 020: Profiles — Stripe customer ID                   ║
-- ║  Adds stripe_customer_id for saved payment methods.             ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

