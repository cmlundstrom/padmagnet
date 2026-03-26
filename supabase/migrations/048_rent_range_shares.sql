-- Track rent-range report email shares
CREATE TABLE IF NOT EXISTS rent_range_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES rent_range_reports(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  brand TEXT DEFAULT 'sfrm',
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_rr_shares_report ON rent_range_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_rr_shares_email ON rent_range_shares(email);

ALTER TABLE rent_range_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rent_range_shares"
  ON rent_range_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
