'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS, Badge, StatCard, baseButton, timeAgo, formatDate } from '../shared';

const CRON_JOBS = [
  { key: 'bridge_sync', label: 'Bridge IDX Sync', schedule: 'Daily 6AM UTC', overdueMs: 25 * 60 * 60 * 1000 },
  { key: 'expire_listings', label: 'Expire Listings', schedule: 'Daily 7AM UTC', overdueMs: 25 * 60 * 60 * 1000 },
  { key: 'expiry_emails', label: 'Expiry Emails', schedule: 'Daily 2PM UTC', overdueMs: 25 * 60 * 60 * 1000 },
  { key: 'delivery_retry', label: 'Delivery Retry', schedule: 'Daily (5min w/ Pro)', overdueMs: 25 * 60 * 60 * 1000 },
  { key: 'rr_sync', label: 'Rent-Range Data Sync', schedule: 'Nightly', overdueMs: 25 * 60 * 60 * 1000 },
];

const ALERT_TYPES = [
  { key: 'alert_cron_failure', label: 'Cron Job Failure', description: 'Email when any cron job fails' },
  { key: 'alert_webhook_failure', label: 'Webhook Failure', description: 'Email when inbound webhooks fail' },
  { key: 'alert_delivery_backup', label: 'Delivery Queue Backup', description: 'Email when failed deliveries exceed threshold' },
  { key: 'alert_sync_failure', label: 'Bridge Sync Failure', description: 'Email when MLS sync fails or returns errors' },
];

const WEBHOOK_SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'resend', label: 'Resend' },
];

const WEBHOOK_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'processed', label: 'Processed' },
  { value: 'failed', label: 'Failed' },
  { value: 'duplicate', label: 'Duplicate' },
];

export default function SystemHealthPanel() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertToggles, setAlertToggles] = useState({});
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertDirty, setAlertDirty] = useState(false);

  // Twilio config state
  const [twilioConfig, setTwilioConfig] = useState({
    twilio_phone: '(253) 600-3665',
    twilio_caller_id: 'PadMagnet',
    twilio_console_url: 'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming',
    twilio_a2p_status: 'Pending Vetting',
  });

  // Bridge IDX feed state
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [bridgePortalUrl, setBridgePortalUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [bridgeNote, setBridgeNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  // Webhook log state
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [webhookSource, setWebhookSource] = useState('');
  const [webhookStatus, setWebhookStatus] = useState('');
  const [webhookLimit, setWebhookLimit] = useState(50);
  const [webhookExpanded, setWebhookExpanded] = useState(null);

  // Section collapse state
  const [sections, setSections] = useState({
    cron: true,
    bridge: true,
    queue: true,
    twilio: true,
    apis: true,
    alerts: true,
    webhooks: false,
  });

  const toggleSection = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/system-health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setAlertEmail(data.alertConfig?.alert_email || 'cmlundstrom@gmail.com');
        const toggles = {};
        ALERT_TYPES.forEach(a => {
          toggles[a.key] = data.alertConfig?.[a.key] !== 'false';
        });
        setAlertToggles(toggles);
        // Merge twilio config from DB
        setTwilioConfig(prev => ({
          ...prev,
          ...(data.alertConfig?.twilio_phone && { twilio_phone: data.alertConfig.twilio_phone }),
          ...(data.alertConfig?.twilio_caller_id && { twilio_caller_id: data.alertConfig.twilio_caller_id }),
          ...(data.alertConfig?.twilio_console_url && { twilio_console_url: data.alertConfig.twilio_console_url }),
          ...(data.alertConfig?.twilio_a2p_status && { twilio_a2p_status: data.alertConfig.twilio_a2p_status }),
        }));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const fetchWebhookLogs = useCallback(async () => {
    setWebhookLoading(true);
    try {
      const params = new URLSearchParams();
      if (webhookSource) params.set('source', webhookSource);
      if (webhookStatus) params.set('status', webhookStatus);
      params.set('limit', String(webhookLimit));
      const res = await fetch(`/api/admin/webhook-logs?${params}`);
      if (res.ok) setWebhookLogs(await res.json());
    } catch { /* silent */ }
    setWebhookLoading(false);
  }, [webhookSource, webhookStatus, webhookLimit]);

  const fetchBridgeData = useCallback(async () => {
    try {
      const [overviewRes, configRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/config?keys=bridge_portal_url,bridge_notes'),
      ]);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setLastSync(data.lastSync);
        setSyncLogs(data.syncLogs || []);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        if (data.bridge_portal_url) setBridgePortalUrl(data.bridge_portal_url);
        if (data.bridge_notes) setBridgeNote(data.bridge_notes);
      }
    } catch { /* silent */ }
  }, []);

  async function saveConfig(key, value) {
    try {
      await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch { /* silent */ }
  }

  useEffect(() => { fetchHealth(); fetchBridgeData(); }, [fetchHealth, fetchBridgeData]);
  useEffect(() => { fetchWebhookLogs(); }, [fetchWebhookLogs]);

  async function saveAlertConfig() {
    setSavingAlerts(true);
    try {
      // Save alert email
      await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'alert_email', value: alertEmail }),
      });
      // Save each toggle
      for (const [key, enabled] of Object.entries(alertToggles)) {
        await fetch('/api/admin/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: String(enabled) }),
        });
      }
      setAlertDirty(false);
    } catch { /* silent */ }
    setSavingAlerts(false);
  }

  async function sendTestAlert() {
    try {
      await fetch('/api/admin/alerts', { method: 'POST' });
      alert('Test alert sent to ' + alertEmail);
    } catch {
      alert('Failed to send test alert');
    }
  }

  if (loading) {
    return <div style={{ color: COLORS.textDim, padding: 40, textAlign: 'center' }}>Loading system health...</div>;
  }

  const cronData = health?.cronHealth || {};
  const queue = health?.queue || {};

  return (
    <div>
      {/* ======== CRON HEALTH ======== */}
      <SectionHeader title="Cron Job Health" open={sections.cron} onToggle={() => toggleSection('cron')} />
      {sections.cron && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {CRON_JOBS.map(job => {
              const data = cronData[job.key];
              const lastRun = data?.lastRun;
              const isOverdue = !lastRun || (Date.now() - new Date(lastRun.created_at).getTime()) > job.overdueMs;
              const hasFailed = data?.failCount24h > 0;
              const accent = isOverdue ? COLORS.red : hasFailed ? COLORS.amber : COLORS.green;

              return (
                <div key={job.key} style={{
                  background: COLORS.surface, borderRadius: '8px', padding: '12px 14px',
                  border: `1px solid ${isOverdue ? COLORS.red + '60' : COLORS.border}`,
                  flex: '1 1 200px', minWidth: 180,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '11px', color: COLORS.textDim, fontWeight: 600, textTransform: 'uppercase' }}>{job.label}</span>
                    <Badge color={isOverdue ? 'red' : hasFailed ? 'amber' : 'green'}>
                      {isOverdue ? 'OVERDUE' : hasFailed ? 'ISSUES' : 'OK'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: accent, lineHeight: 1.1 }}>
                    {lastRun ? timeAgo(lastRun.created_at) : 'Never'}
                  </div>
                  <div style={{ fontSize: '10px', color: COLORS.textDim, marginTop: 4 }}>{job.schedule}</div>
                  {lastRun?.result && (
                    <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: 2 }}>
                      {Object.entries(lastRun.result).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </div>
                  )}
                  {lastRun?.error_message && (
                    <div style={{ fontSize: '10px', color: COLORS.red, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lastRun.error_message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======== BRIDGE IDX FEED ======== */}
      <SectionHeader title="Bridge IDX Feed" open={sections.bridge} onToggle={() => toggleSection('bridge')} />
      {sections.bridge && (
        <div style={{ marginBottom: 28 }}>
          {/* Feed status row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`,
            marginBottom: 8,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: lastSync?.status === 'success' ? COLORS.green : lastSync?.status === 'failed' ? COLORS.red : COLORS.amber,
              boxShadow: `0 0 8px ${lastSync?.status === 'success' ? COLORS.green : COLORS.amber}44`,
            }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: COLORS.text }}>Bridge IDX</span>
              <span style={{ color: COLORS.textDim, fontSize: '12px', marginLeft: 8 }}>MIAMIRE</span>
            </div>
            <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
              Last sync: {lastSync ? timeAgo(lastSync.completed_at) : 'never'}
            </span>
            <Badge color={lastSync ? 'green' : 'gray'}>{lastSync ? 'Active' : 'No Data'}</Badge>
          </div>

          {/* Notes */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8,
            padding: '8px 16px', background: COLORS.bg, borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
          }}>
            <span style={{ fontSize: '11px', color: COLORS.textDim, fontWeight: 600, whiteSpace: 'nowrap', marginTop: 2 }}>Notes:</span>
            {editingNote ? (
              <textarea
                value={bridgeNote}
                onChange={e => setBridgeNote(e.target.value)}
                onBlur={() => { setEditingNote(false); saveConfig('bridge_notes', bridgeNote); }}
                autoFocus
                rows={3}
                style={{
                  flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px', padding: '4px 8px', color: COLORS.text,
                  fontSize: '11px', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                  resize: 'vertical', lineHeight: 1.5,
                }}
              />
            ) : (
              <span style={{ flex: 1, fontSize: '11px', color: COLORS.textDim, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {bridgeNote}
              </span>
            )}
            <button
              onClick={() => { if (editingNote) saveConfig('bridge_notes', bridgeNote); setEditingNote(!editingNote); }}
              style={{ background: 'none', border: 'none', color: COLORS.textDim, cursor: 'pointer', fontSize: '11px', padding: '2px 6px', whiteSpace: 'nowrap' }}
            >
              {editingNote ? 'done' : 'edit'}
            </button>
          </div>

          {/* Feed Portal URL */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            padding: '8px 16px', background: COLORS.bg, borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
          }}>
            <span style={{ fontSize: '11px', color: COLORS.textDim, fontWeight: 600, whiteSpace: 'nowrap' }}>Feed Portal:</span>
            {editingUrl ? (
              <input
                value={bridgePortalUrl}
                onChange={e => setBridgePortalUrl(e.target.value)}
                onBlur={() => { setEditingUrl(false); saveConfig('bridge_portal_url', bridgePortalUrl); }}
                onKeyDown={e => { if (e.key === 'Enter') { setEditingUrl(false); saveConfig('bridge_portal_url', bridgePortalUrl); } }}
                autoFocus
                style={{
                  flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px', padding: '3px 8px', color: COLORS.text,
                  fontSize: '12px', fontFamily: 'monospace', outline: 'none',
                }}
              />
            ) : (
              <a href={bridgePortalUrl} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, fontSize: '12px', color: COLORS.brand, textDecoration: 'none', fontFamily: 'monospace' }}>
                {bridgePortalUrl}
              </a>
            )}
            <button
              onClick={() => { if (editingUrl) saveConfig('bridge_portal_url', bridgePortalUrl); setEditingUrl(!editingUrl); }}
              style={{ background: 'none', border: 'none', color: COLORS.textDim, cursor: 'pointer', fontSize: '11px', padding: '2px 6px' }}
            >
              {editingUrl ? 'done' : 'edit'}
            </button>
          </div>

          {/* Recent Sync Activity */}
          <div style={{ fontSize: '11px', color: COLORS.textDim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Recent Sync Activity</div>
          <div style={{ background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            {syncLogs.length === 0 ? (
              <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: '13px' }}>No sync records yet</div>
            ) : (
              syncLogs.map((log, i) => (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                  borderBottom: i < syncLogs.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                }}>
                  <Badge color={log.status === 'success' ? 'green' : log.status === 'partial' ? 'amber' : 'red'}>{log.status}</Badge>
                  <span style={{ fontSize: '13px', color: COLORS.text, flex: 1 }}>
                    +{log.listings_added} added · {log.listings_updated} updated · -{log.listings_deactivated} removed
                    {log.listings_skipped > 0 && <span style={{ color: COLORS.amber }}> · {log.listings_skipped} skipped</span>}
                  </span>
                  <span style={{ fontSize: '12px', color: COLORS.textDim }}>{(log.duration_ms / 1000).toFixed(1)}s</span>
                  <span style={{ fontSize: '12px', color: COLORS.textDim }}>{formatDate(log.started_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======== DELIVERY QUEUE ======== */}
      <SectionHeader title="Delivery Queue" open={sections.queue} onToggle={() => toggleSection('queue')} />
      {sections.queue && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <StatCard label="Pending" value={queue.pending} accent={queue.pending > 0 ? COLORS.amber : COLORS.green} />
            <StatCard label="Processing" value={queue.processing} accent={COLORS.brand} />
            <StatCard label="Sent" value={queue.sent} accent={COLORS.green} />
            <StatCard label="Failed" value={queue.failed} accent={queue.failed > 0 ? COLORS.red : COLORS.green} />
          </div>

          {/* Failed deliveries table */}
          {(health?.failedDeliveries || []).length > 0 && (
            <div style={{ background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '80px 80px 60px 1fr 140px',
                padding: '8px 16px', borderBottom: `1px solid ${COLORS.border}`,
                fontSize: '11px', fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase',
              }}>
                <span>Channel</span><span>Status</span><span>Tries</span><span>Error</span><span>Updated</span>
              </div>
              {health.failedDeliveries.map((d, i) => (
                <div key={d.id} style={{
                  display: 'grid', gridTemplateColumns: '80px 80px 60px 1fr 140px',
                  alignItems: 'center', padding: '8px 16px',
                  borderBottom: i < health.failedDeliveries.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                }}>
                  <Badge color="blue">{d.channel}</Badge>
                  <Badge color="red">{d.status}</Badge>
                  <span style={{ fontSize: '12px', color: COLORS.textMuted }}>{d.attempts}/{d.max_attempts}</span>
                  <span style={{ fontSize: '11px', color: COLORS.red, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.last_error || '—'}
                  </span>
                  <span style={{ fontSize: '11px', color: COLORS.textDim }}>{formatDate(d.updated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== TWILIO / SMS ======== */}
      <SectionHeader title="SMS / Twilio" open={sections.twilio} onToggle={() => toggleSection('twilio')} />
      {sections.twilio && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: COLORS.surface, borderRadius: '8px', padding: '16px',
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <InfoRow label="Phone Number" value={twilioConfig.twilio_phone} />
              <InfoRow label="Caller ID" value={twilioConfig.twilio_caller_id} />
              <InfoRow label="A2P Campaign Status">
                <Badge color={twilioConfig.twilio_a2p_status === 'Approved' ? 'green' : 'amber'}>
                  {twilioConfig.twilio_a2p_status}
                </Badge>
              </InfoRow>
              <InfoRow label="Console">
                <a href={twilioConfig.twilio_console_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: COLORS.brand, textDecoration: 'none', fontFamily: 'monospace' }}>
                  Twilio Console →
                </a>
              </InfoRow>
            </div>
            <div style={{ marginTop: 12, fontSize: '11px', color: COLORS.textDim }}>
              A2P 10DLC Campaign ID: <span style={{ fontFamily: 'monospace', color: COLORS.textMuted }}>CM0b1b1f1ba62a8e21f6036f8ea77d00ad</span>
            </div>
          </div>
        </div>
      )}

      {/* ======== EXTERNAL APIs ======== */}
      <SectionHeader title="External APIs" open={sections.apis} onToggle={() => toggleSection('apis')} />
      {sections.apis && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: COLORS.surface, borderRadius: '8px', padding: '16px',
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <InfoRow label="Brave Search API" value={process.env.NEXT_PUBLIC_BRAVE_API_KEY ? 'Configured' : 'Configured (server-side)'}>
                <Badge color="green">Active</Badge>
              </InfoRow>
              <InfoRow label="Usage Tier" value="Free (2,000 searches/mo)" />
              <InfoRow label="Purpose" value="Rent-Range Finder web research" />
              <InfoRow label="Console">
                <a href="https://brave.com/search/api/" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: COLORS.brand, textDecoration: 'none' }}>
                  Brave API Dashboard →
                </a>
              </InfoRow>
            </div>
          </div>
        </div>
      )}

      {/* ======== ALERT CONFIGURATION ======== */}
      <SectionHeader title="Alert Configuration" open={sections.alerts} onToggle={() => toggleSection('alerts')} />
      {sections.alerts && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: COLORS.surface, borderRadius: '8px', padding: '16px',
            border: `1px solid ${COLORS.border}`,
          }}>
            {/* Alert email */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <label style={{ fontSize: '12px', color: COLORS.textDim, fontWeight: 600, whiteSpace: 'nowrap' }}>Alert Email:</label>
              <input
                value={alertEmail}
                onChange={e => { setAlertEmail(e.target.value); setAlertDirty(true); }}
                style={{
                  flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                  borderRadius: '6px', padding: '6px 12px', color: COLORS.text,
                  fontSize: '13px', fontFamily: 'monospace', outline: 'none', maxWidth: 320,
                }}
              />
            </div>

            {/* Alert type toggles */}
            {ALERT_TYPES.map(alert => (
              <div key={alert.key} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderTop: `1px solid ${COLORS.border}`,
              }}>
                <div
                  onClick={() => {
                    setAlertToggles(prev => ({ ...prev, [alert.key]: !prev[alert.key] }));
                    setAlertDirty(true);
                  }}
                  style={{
                    width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                    background: alertToggles[alert.key] ? COLORS.green : COLORS.border,
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 2,
                    left: alertToggles[alert.key] ? 18 : 2,
                    transition: 'left 0.2s',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: COLORS.text, fontWeight: 600 }}>{alert.label}</div>
                  <div style={{ fontSize: '11px', color: COLORS.textDim }}>{alert.description}</div>
                </div>
              </div>
            ))}

            {/* Save + Test buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={saveAlertConfig} disabled={!alertDirty || savingAlerts} style={{
                ...baseButton, background: alertDirty ? COLORS.brand : COLORS.border,
                color: alertDirty ? '#000' : COLORS.textDim, opacity: savingAlerts ? 0.6 : 1,
              }}>
                {savingAlerts ? 'Saving...' : 'Save Alert Settings'}
              </button>
              <button onClick={sendTestAlert} style={{
                ...baseButton, background: 'transparent',
                border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
              }}>
                Send Test Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== WEBHOOK LOG ======== */}
      <SectionHeader title="Webhook Log" open={sections.webhooks} onToggle={() => toggleSection('webhooks')} badge={webhookLogs.filter(l => l.status === 'failed').length} />
      {sections.webhooks && (
        <div style={{ marginBottom: 28 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <StatCard label="Showing" value={webhookLogs.length} sub={`of last ${webhookLimit}`} accent={COLORS.brand} />
            <StatCard label="Processed" value={webhookLogs.filter(l => l.status === 'processed').length} accent={COLORS.green} />
            <StatCard label="Failed" value={webhookLogs.filter(l => l.status === 'failed').length} accent={webhookLogs.some(l => l.status === 'failed') ? COLORS.red : COLORS.green} />
            <StatCard label="Duplicates" value={webhookLogs.filter(l => l.status === 'duplicate').length} accent={COLORS.amber} />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterSelect options={WEBHOOK_SOURCE_OPTIONS} value={webhookSource} onChange={setWebhookSource} />
            <FilterSelect options={WEBHOOK_STATUS_OPTIONS} value={webhookStatus} onChange={setWebhookStatus} />
            <select value={webhookLimit} onChange={e => setWebhookLimit(Number(e.target.value))} style={selectStyle}>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={200}>200 rows</option>
            </select>
            <button onClick={fetchWebhookLogs} style={{ ...baseButton, background: COLORS.brand, color: '#000' }}>Refresh</button>
          </div>

          {/* Log Table */}
          <div style={{ background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '90px 80px 160px 1fr 150px',
              padding: '8px 16px', borderBottom: `1px solid ${COLORS.border}`,
              fontSize: '11px', fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase',
            }}>
              <span>Source</span><span>Status</span><span>Event Type</span><span>Details</span><span>Time</span>
            </div>
            {webhookLoading ? (
              <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: '13px' }}>Loading...</div>
            ) : webhookLogs.length === 0 ? (
              <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: '13px' }}>No webhook logs found</div>
            ) : (
              webhookLogs.map((log, i) => (
                <div key={log.id}>
                  <div
                    onClick={() => setWebhookExpanded(webhookExpanded === log.id ? null : log.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '90px 80px 160px 1fr 150px',
                      alignItems: 'center', padding: '8px 16px', cursor: 'pointer',
                      borderBottom: i < webhookLogs.length - 1 || webhookExpanded === log.id ? `1px solid ${COLORS.border}` : 'none',
                      background: webhookExpanded === log.id ? COLORS.surfaceHover : 'transparent',
                    }}
                  >
                    <Badge color={log.source === 'twilio' ? 'blue' : 'purple'}>{log.source}</Badge>
                    <Badge color={log.status === 'processed' ? 'green' : log.status === 'failed' ? 'red' : 'amber'}>{log.status}</Badge>
                    <span style={{ fontSize: '12px', color: COLORS.text, fontFamily: 'monospace' }}>{log.event_type || '—'}</span>
                    <span style={{ fontSize: '12px', color: log.error_message ? COLORS.red : COLORS.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.error_message || log.external_id || '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: COLORS.textDim }}>{formatDate(log.created_at)}</span>
                  </div>
                  {webhookExpanded === log.id && (
                    <div style={{ padding: '12px 16px', background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
                      {log.error_message && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.red, textTransform: 'uppercase' }}>Error: </span>
                          <span style={{ fontSize: '12px', color: COLORS.red }}>{log.error_message}</span>
                        </div>
                      )}
                      {log.conversation_id && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textDim }}>Conversation: </span>
                          <span style={{ fontSize: '12px', color: COLORS.brand, fontFamily: 'monospace' }}>{log.conversation_id}</span>
                        </div>
                      )}
                      {log.message_id && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textDim }}>Message: </span>
                          <span style={{ fontSize: '12px', color: COLORS.brand, fontFamily: 'monospace' }}>{log.message_id}</span>
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase' }}>Payload</span>
                        <pre style={{
                          marginTop: 4, padding: 10, borderRadius: '6px',
                          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                          fontSize: '11px', color: COLORS.textMuted, fontFamily: 'monospace',
                          overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap',
                        }}>
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Helper components ----

function SectionHeader({ title, open, onToggle, badge }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        marginBottom: open ? 12 : 20,
        padding: '8px 0',
      }}
    >
      <span style={{ fontSize: '12px', color: COLORS.textDim, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{title}</h3>
      {badge > 0 && (
        <span style={{
          background: COLORS.red, color: '#fff', fontSize: '10px', fontWeight: 800,
          padding: '2px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
        }}>{badge}</span>
      )}
    </div>
  );
}

function InfoRow({ label, value, children }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: COLORS.textDim, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      {children || <div style={{ fontSize: '14px', color: COLORS.text, fontWeight: 600 }}>{value}</div>}
    </div>
  );
}

function FilterSelect({ options, value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const selectStyle = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '6px',
  padding: '6px 12px',
  color: COLORS.text,
  fontSize: '13px',
  fontFamily: "'DM Sans', sans-serif",
  cursor: 'pointer',
  outline: 'none',
};
