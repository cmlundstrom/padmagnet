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
