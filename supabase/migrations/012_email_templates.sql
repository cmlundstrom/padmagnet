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
