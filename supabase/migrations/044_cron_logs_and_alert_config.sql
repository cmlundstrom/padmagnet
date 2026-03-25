-- Cron job execution logs for system health monitoring
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,           -- 'bridge_sync', 'expire_listings', 'expiry_emails', 'delivery_retry'
  status TEXT NOT NULL DEFAULT 'success',  -- 'success', 'failed', 'partial'
  duration_ms INTEGER,
  result JSONB DEFAULT '{}',        -- job-specific output (counts, errors, etc.)
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cron_logs_job_name ON cron_logs(job_name);
CREATE INDEX idx_cron_logs_created_at ON cron_logs(created_at DESC);

-- RLS: only service role can write, admins can read
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read cron_logs"
  ON cron_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
