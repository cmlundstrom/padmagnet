-- Migration 034: Enable RLS on admin-only tables
-- Step 4 of role architecture fix (see memory/role-architecture-fix.md)
--
-- All 4 tables are admin-only — no public policies means all client-side
-- access (anon/authenticated) is denied. Service_role key bypasses RLS
-- for admin API routes and cron jobs.

-- audit_log: admin activity log (written by API routes, read by admin dashboard)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- site_config: admin-editable config (bridge_portal_url, bridge_notes, etc.)
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- tickets: admin support ticket system (no user_id — admin-only for now)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- ticket_messages: messages within support tickets (admin-only for now)
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Future: If a tenant/owner-facing support UI is built, add user_id column
-- to tickets and create SELECT/INSERT policies for authenticated users.
