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
