import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/system-health — cron health, delivery queue stats, alert config
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServiceClient();

    // Cron health: last run per job
    const { data: cronLogs } = await supabase
      .from('cron_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Fallback: pull latest sync_logs for Bridge Sync (historical data before cron_logs existed)
    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    // Group by job_name, get latest per job
    const jobNames = ['bridge_sync', 'expire_listings', 'expiry_emails', 'delivery_retry'];
    const cronHealth = {};
    for (const name of jobNames) {
      const logs = (cronLogs || []).filter(l => l.job_name === name);
      cronHealth[name] = {
        lastRun: logs[0] || null,
        recentLogs: logs.slice(0, 5),
        failCount24h: logs.filter(l => l.status === 'failed' && new Date(l.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
      };
    }

    // If bridge_sync has no cron_logs yet, synthesize from sync_logs
    if (!cronHealth.bridge_sync.lastRun && syncLogs && syncLogs.length > 0) {
      const last = syncLogs[0];
      cronHealth.bridge_sync.lastRun = {
        job_name: 'bridge_sync',
        status: last.status,
        duration_ms: last.duration_ms,
        result: {
          added: last.listings_added,
          updated: last.listings_updated,
          deactivated: last.listings_deactivated,
          skipped: last.listings_skipped,
        },
        error_message: last.error_message,
        created_at: last.completed_at || last.started_at,
      };
      cronHealth.bridge_sync.recentLogs = syncLogs.map(s => ({
        job_name: 'bridge_sync',
        status: s.status,
        duration_ms: s.duration_ms,
        result: { added: s.listings_added, updated: s.listings_updated, deactivated: s.listings_deactivated },
        error_message: s.error_message,
        created_at: s.completed_at || s.started_at,
      }));
    }

    // Delivery queue stats
    const { data: queueStats } = await supabase
      .from('message_delivery_queue')
      .select('status');

    const queue = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      total: (queueStats || []).length,
    };
    for (const item of (queueStats || [])) {
      if (queue[item.status] !== undefined) queue[item.status]++;
    }

    // Failed delivery details (last 20)
    const { data: failedDeliveries } = await supabase
      .from('message_delivery_queue')
      .select('id, channel, status, attempts, max_attempts, last_error, created_at, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20);

    // Alert config from site_config
    const { data: alertConfig } = await supabase
      .from('site_config')
      .select('key, value')
      .in('key', ['alert_email', 'alert_cron_failure', 'alert_webhook_failure', 'alert_delivery_backup', 'alert_sync_failure', 'twilio_phone', 'twilio_caller_id', 'twilio_console_url', 'twilio_a2p_status']);

    const config = {};
    for (const row of (alertConfig || [])) {
      config[row.key] = row.value;
    }

    return NextResponse.json({
      cronHealth,
      queue,
      failedDeliveries: failedDeliveries || [],
      alertConfig: config,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
