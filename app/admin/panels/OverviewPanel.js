'use client';

import { useState, useEffect } from 'react';
import { COLORS, Badge, StatCard, timeAgo, formatDate } from '../shared';

export default function OverviewPanel({ openTicketCount = 0 }) {
  const [stats, setStats] = useState({ activeListings: 0, ownerListings: 0 });
  const [lastSync, setLastSync] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastOwnerListing, setLastOwnerListing] = useState(null);
  const [bridgePortalUrl, setBridgePortalUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [bridgeNote, setBridgeNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  useEffect(() => {
    fetchOverviewData();
    fetchConfig();
    fetchMetrics();
  }, []);

  async function fetchOverviewData() {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setStats({ activeListings: data.activeListings, ownerListings: data.ownerListings });
        setLastSync(data.lastSync);
        setSyncLogs(data.syncLogs || []);
        setLastOwnerListing(data.lastOwnerListing);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        setMetrics(await res.json());
      } else {
        setMetricsError('Failed to load metrics');
      }
    } catch {
      setMetricsError('Failed to load metrics');
    }
    setMetricsLoading(false);
  }

  async function fetchConfig() {
    try {
      const res = await fetch('/api/admin/config?keys=bridge_portal_url,bridge_notes');
      if (res.ok) {
        const data = await res.json();
        if (data.bridge_portal_url) setBridgePortalUrl(data.bridge_portal_url);
        if (data.bridge_notes) setBridgeNote(data.bridge_notes);
      }
    } catch { /* silent */ }
  }

  async function saveConfig(key, value) {
    try {
      await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch { /* silent */ }
  }

  if (loading) {
    return <div style={{ color: COLORS.textDim, padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard
          label="Total Owner Active Listings"
          value={stats.ownerListings}
          sub={`Active owner listings as of ${today}`}
          accent={COLORS.green}
        />
        <StatCard label="Active MLS Listings" value={stats.activeListings} sub="Live IDX rental listings" accent={COLORS.purple} />
        <StatCard label="Open Tickets" value={openTicketCount} sub="SMS-first" accent={openTicketCount > 0 ? COLORS.amber : COLORS.green} />
        <StatCard
          label="Last IDX Sync"
          value={lastSync ? timeAgo(lastSync.completed_at) : 'never'}
          sub={lastSync ? `${lastSync.listings_added} added, ${lastSync.listings_updated} updated` : 'No syncs yet'}
          accent={COLORS.brand}
        />
      </div>

      {/* Conversion Funnel */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Conversion Funnel</h3>
        {metricsLoading ? (
          <div style={{ color: COLORS.textDim, padding: 20, textAlign: 'center', fontSize: '13px' }}>Loading metrics...</div>
        ) : metricsError ? (
          <div style={{ color: COLORS.red, padding: 20, textAlign: 'center', fontSize: '13px' }}>{metricsError}</div>
        ) : metrics ? (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <StatCard label="Owners Registered" value={metrics.funnel.ownersRegistered} accent={COLORS.brand} />
            <StatCard label="Listings Created" value={metrics.funnel.listingsCreated} accent={COLORS.purple} />
            <StatCard
              label="Listings Activated"
              value={metrics.funnel.listingsActive}
              sub={metrics.funnel.listingsCreated > 0
                ? `${Math.round((metrics.funnel.listingsActive / metrics.funnel.listingsCreated) * 100)}% activation rate`
                : 'No listings yet'}
              accent={COLORS.green}
            />
            <StatCard label="Pro Upgrades" value={metrics.revenue.proSubscribers} accent={COLORS.amber} />
            <StatCard label="Premium Upgrades" value={metrics.revenue.premiumSubscribers} accent={COLORS.amber} />
          </div>
        ) : null}
      </div>

      {/* Engagement (7 days) */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Engagement (7 days)</h3>
        {metricsLoading ? (
          <div style={{ color: COLORS.textDim, padding: 20, textAlign: 'center', fontSize: '13px' }}>Loading metrics...</div>
        ) : metricsError ? (
          <div style={{ color: COLORS.red, padding: 20, textAlign: 'center', fontSize: '13px' }}>{metricsError}</div>
        ) : metrics ? (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <StatCard label="Total Swipes" value={metrics.engagement.swipes7d} accent={COLORS.brand} />
            <StatCard label="Right Swipe Rate" value={`${metrics.engagement.rightSwipeRate}%`} sub={`${metrics.engagement.rightSwipes7d} right swipes`} accent={COLORS.green} />
            <StatCard label="Conversations" value={metrics.engagement.totalConversations} accent={COLORS.purple} />
            <StatCard label="Messages Sent" value={metrics.engagement.messages7d} accent={COLORS.brand} />
          </div>
        ) : null}
      </div>

      {/* Last Owner Listing Signup */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Last Owner Listing Signup</h3>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: COLORS.green,
            boxShadow: `0 0 8px ${COLORS.green}44`,
          }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: COLORS.text }}>
              {lastOwnerListing ? lastOwnerListing.city || 'Unknown City' : 'No owner listings yet'}
            </span>
            {lastOwnerListing && (
              <span style={{ color: COLORS.textDim, fontSize: '12px', marginLeft: 8 }}>
                {lastOwnerListing.street_name ? `${lastOwnerListing.street_number || ''} ${lastOwnerListing.street_name}`.trim() : ''}
              </span>
            )}
          </div>
          <span style={{ fontSize: '12px', color: COLORS.textDim }}>
            {lastOwnerListing ? formatDate(lastOwnerListing.created_at) : '--'}
          </span>
          <Badge color="green">Connected to App</Badge>
        </div>
      </div>

      {/* Feed Health */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Feed Health</h3>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`,
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
        {/* Bridge IDX notes — editable */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8,
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
                flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.borderLight}`,
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
            onClick={() => {
              if (editingNote) saveConfig('bridge_notes', bridgeNote);
              setEditingNote(!editingNote);
            }}
            style={{
              background: 'none', border: 'none', color: COLORS.textDim,
              cursor: 'pointer', fontSize: '11px', padding: '2px 6px', whiteSpace: 'nowrap',
            }}
          >
            {editingNote ? 'done' : 'edit'}
          </button>
        </div>

        {/* Bridge Portal URL — editable quick-access */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
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
                flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.borderLight}`,
                borderRadius: '4px', padding: '3px 8px', color: COLORS.text,
                fontSize: '12px', fontFamily: 'monospace', outline: 'none',
              }}
            />
          ) : (
            <a
              href={bridgePortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, fontSize: '12px', color: COLORS.brand, textDecoration: 'none', fontFamily: 'monospace' }}
            >
              {bridgePortalUrl}
            </a>
          )}
          <button
            onClick={() => {
              if (editingUrl) saveConfig('bridge_portal_url', bridgePortalUrl);
              setEditingUrl(!editingUrl);
            }}
            style={{
              background: 'none', border: 'none', color: COLORS.textDim,
              cursor: 'pointer', fontSize: '11px', padding: '2px 6px',
            }}
          >
            {editingUrl ? 'done' : 'edit'}
          </button>
        </div>
      </div>

      {/* Recent Sync Activity */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recent Sync Activity</h3>
        <div style={{ background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          {syncLogs.length === 0 ? (
            <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: '13px' }}>
              No sync records yet
            </div>
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

    </div>
  );
}
