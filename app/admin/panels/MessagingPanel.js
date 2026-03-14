'use client';

import { useState, useEffect } from 'react';
import { COLORS, Badge, StatCard, timeAgo, formatDate } from '../shared';

export default function MessagingPanel() {
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/messaging');
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalConversations: data.totalConversations,
          activeConversations: data.activeConversations,
          totalMessages: data.totalMessages,
          messagesToday: data.messagesToday,
          messagesThisWeek: data.messagesThisWeek,
          pendingDeliveryQueue: data.pendingDeliveryQueue,
          failedDeliveryQueue: data.failedDeliveryQueue,
        });
        setConversations(data.recentConversations || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  if (loading) {
    return <div style={{ color: COLORS.textDim, padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard
          label="Total Conversations"
          value={stats?.totalConversations ?? 0}
          sub={`${stats?.activeConversations ?? 0} active this week`}
          accent={COLORS.brand}
        />
        <StatCard
          label="Messages Today"
          value={stats?.messagesToday ?? 0}
          sub={`${stats?.messagesThisWeek ?? 0} this week`}
          accent={COLORS.green}
        />
        <StatCard
          label="Total Messages"
          value={stats?.totalMessages ?? 0}
          accent={COLORS.purple}
        />
        <StatCard
          label="Delivery Queue"
          value={stats?.pendingDeliveryQueue ?? 0}
          sub={stats?.failedDeliveryQueue > 0 ? `${stats.failedDeliveryQueue} failed` : 'All clear'}
          accent={stats?.failedDeliveryQueue > 0 ? COLORS.red : stats?.pendingDeliveryQueue > 0 ? COLORS.amber : COLORS.green}
        />
      </div>

      {/* Recent Conversations */}
      <div>
        <h3 style={sectionTitle}>Recent Conversations</h3>
        <div style={{
          background: COLORS.surface, borderRadius: '8px',
          border: `1px solid ${COLORS.border}`, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 140px 80px',
            padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
            fontSize: '11px', fontWeight: 700, color: COLORS.textDim,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>Address / Preview</span>
            <span>Type</span>
            <span>Last Message</span>
            <span style={{ textAlign: 'right' }}>Unread</span>
          </div>

          {conversations.length === 0 ? (
            <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: '13px' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map((c, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 140px 80px',
                alignItems: 'center', padding: '10px 16px',
                borderBottom: i < conversations.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.text }}>
                    {c.listing_address || 'Unknown'}
                  </div>
                  <div style={{
                    fontSize: '12px', color: COLORS.textDim, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 300,
                  }}>
                    {c.last_message_text || '—'}
                  </div>
                </div>
                <Badge color={c.conversation_type === 'external_agent' ? 'amber' : 'blue'}>
                  {c.conversation_type === 'external_agent' ? 'MLS Agent' : 'Internal'}
                </Badge>
                <span style={{ fontSize: '12px', color: COLORS.textDim }}>
                  {c.last_message_at ? timeAgo(c.last_message_at) : '—'}
                </span>
                <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {c.tenant_unread_count > 0 && (
                    <Badge color="cyan">{c.tenant_unread_count} T</Badge>
                  )}
                  {c.owner_unread_count > 0 && (
                    <Badge color="purple">{c.owner_unread_count} O</Badge>
                  )}
                  {!c.tenant_unread_count && !c.owner_unread_count && (
                    <span style={{ fontSize: '12px', color: COLORS.textDim }}>—</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const sectionTitle = {
  fontSize: '14px', fontWeight: 700, color: COLORS.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
};
