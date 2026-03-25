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
