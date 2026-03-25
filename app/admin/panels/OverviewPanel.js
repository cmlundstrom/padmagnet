'use client';

import { useState, useEffect } from 'react';
import { COLORS, Badge, StatCard, timeAgo, formatDate } from '../shared';

export default function OverviewPanel({ openTicketCount = 0 }) {
  const [stats, setStats] = useState({ activeListings: 0, ownerListings: 0 });
  const [lastSync, setLastSync] = useState(null);
  const [lastOwnerListing, setLastOwnerListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  useEffect(() => {
    fetchOverviewData();
    fetchMetrics();
  }, []);

  async function fetchOverviewData() {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setStats({ activeListings: data.activeListings, ownerListings: data.ownerListings });
        setLastSync(data.lastSync);
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



  if (loading) {
    return <div style={{ color: COLORS.textDim, padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
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
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Total Swipes" value={metrics.engagement.swipes7d} accent={COLORS.brand} />
            <StatCard label="Right Swipe Rate" value={`${metrics.engagement.rightSwipeRate}%`} sub={`${metrics.engagement.rightSwipes7d} right swipes`} accent={COLORS.green} />
            <StatCard label="Conversations" value={metrics.engagement.totalConversations} accent={COLORS.purple} />
            <StatCard label="Messages Sent" value={metrics.engagement.messages7d} accent={COLORS.brand} />
          </div>
        ) : null}
      </div>

      {/* Revenue */}
      {!metricsLoading && !metricsError && metrics && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Revenue</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Today" value={`$${((metrics.revenue.today || 0) / 100).toFixed(2)}`} accent={COLORS.green} />
            <StatCard label="This Week" value={`$${((metrics.revenue.week || 0) / 100).toFixed(2)}`} accent={COLORS.green} />
            <StatCard label="This Month" value={`$${((metrics.revenue.month || 0) / 100).toFixed(2)}`} accent={COLORS.brand} />
            <StatCard label="All Time" value={`$${((metrics.revenue.total || 0) / 100).toFixed(2)}`} accent={COLORS.purple} />
          </div>
        </div>
      )}

      {/* Tenant Funnel */}
      {!metricsLoading && !metricsError && metrics?.tenantFunnel && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Tenant Funnel</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Registered" value={metrics.tenantFunnel.registered} accent={COLORS.brand} />
            <StatCard label="Preferences Set" value={metrics.tenantFunnel.preferencesSet} accent={COLORS.purple} />
            <StatCard label="First Swipe" value={metrics.tenantFunnel.swiped} accent={COLORS.amber} />
            <StatCard label="First Conversation" value={metrics.tenantFunnel.conversationStarted} accent={COLORS.green} />
            <StatCard label="First Message" value={metrics.tenantFunnel.messageSent} accent={COLORS.green} />
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      {!metricsLoading && !metricsError && metrics?.expiryForecast && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Expiring Soon</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Next 7 Days" value={metrics.expiryForecast.next7d} accent={metrics.expiryForecast.next7d > 0 ? COLORS.amber : COLORS.green} />
            <StatCard label="Next 3 Days" value={metrics.expiryForecast.next3d} accent={metrics.expiryForecast.next3d > 0 ? COLORS.amber : COLORS.green} />
            <StatCard label="Tomorrow" value={metrics.expiryForecast.next1d} accent={metrics.expiryForecast.next1d > 0 ? COLORS.red : COLORS.green} />
          </div>
        </div>
      )}

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


    </div>
  );
}
