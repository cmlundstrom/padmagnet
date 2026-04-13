'use client';

import { useState, useCallback } from 'react';

const COLORS = {
  bg: '#0A0E17',
  surface: '#111827',
  border: '#1e293b',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  brand: '#3B82F6',
  amber: '#f59e0b',
  green: '#22c55e',
  red: '#ef4444',
  purple: '#a78bfa',
};

const ROLE_STYLES = {
  user: { bg: '#1e3a5f', color: '#93c5fd', label: 'Renter' },
  pad:  { bg: '#1a2236', color: '#e2e8f0', label: 'AskPad' },
};

const TYPE_BADGES = {
  text:          { color: COLORS.brand, label: 'text' },
  listings:      { color: COLORS.green, label: 'listings' },
  rebuff:        { color: COLORS.amber, label: 'rebuff' },
  cooldown:      { color: COLORS.red, label: 'cooldown' },
  limit_reached: { color: COLORS.red, label: 'limit' },
  error:         { color: COLORS.red, label: 'error' },
};

function formatTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function AskPadHistory({ userId, userName }) {
  const [messages, setMessages] = useState(null); // null = not loaded, [] = empty
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchHistory = useCallback(async () => {
    if (messages !== null) {
      // Already loaded — just toggle visibility
      setExpanded(prev => !prev);
      return;
    }
    setLoading(true);
    setExpanded(true);
    try {
      const res = await fetch(`/api/ask-pad/history?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
    setLoading(false);
  }, [userId, messages]);

  const filtered = messages && filter
    ? messages.filter(m => m.text?.toLowerCase().includes(filter.toLowerCase()))
    : messages;

  // Show newest first
  const sorted = filtered ? [...filtered].reverse() : [];

  // Summary stats
  const totalQueries = messages ? messages.filter(m => m.role === 'user').length : 0;
  const totalResponses = messages ? messages.filter(m => m.role === 'pad' && (m.type === 'text' || m.type === 'listings')).length : 0;
  const rebuffs = messages ? messages.filter(m => m.type === 'rebuff').length : 0;
  const lastQueryTs = messages && messages.length > 0
    ? messages.filter(m => m.role === 'user').pop()?.ts
    : null;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Toggle button */}
      <button
        onClick={fetchHistory}
        style={{
          padding: '6px 14px', borderRadius: 6, border: `1px solid ${COLORS.brand}44`,
          background: COLORS.brand + '18', color: COLORS.brand,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: expanded ? 10 : 0,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {loading ? 'Loading...' : expanded ? '▼ Hide AskPad History' : '▶ View AskPad History'}
      </button>

      {expanded && messages !== null && (
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: 14, maxHeight: 400, display: 'flex', flexDirection: 'column',
        }}>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>
              <strong style={{ color: COLORS.text }}>{totalQueries}</strong> queries
            </span>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>
              <strong style={{ color: COLORS.green }}>{totalResponses}</strong> on-topic
            </span>
            {rebuffs > 0 && (
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                <strong style={{ color: COLORS.amber }}>{rebuffs}</strong> rebuffs
              </span>
            )}
            {lastQueryTs && (
              <span style={{ fontSize: 11, color: COLORS.textDim }}>
                Last: {formatTs(lastQueryTs)}
              </span>
            )}

            {/* Search filter */}
            <input
              type="text"
              placeholder="Filter messages..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                marginLeft: 'auto', padding: '4px 10px', background: COLORS.bg,
                border: `1px solid ${COLORS.border}`, borderRadius: 4,
                color: COLORS.text, fontSize: 12, width: 180,
              }}
            />
          </div>

          {/* Message list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {sorted.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.textDim, textAlign: 'center', padding: 20 }}>
                {filter ? 'No messages match filter' : 'No AskPad history for this renter'}
              </div>
            ) : sorted.map((msg, i) => {
              const rs = ROLE_STYLES[msg.role] || ROLE_STYLES.pad;
              const tb = TYPE_BADGES[msg.type] || null;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: 8, padding: '6px 0',
                    borderBottom: i < sorted.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Role badge */}
                  <span style={{
                    display: 'inline-block', padding: '2px 6px', borderRadius: 4,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.03em',
                    background: rs.bg, color: rs.color, whiteSpace: 'nowrap',
                    minWidth: 48, textAlign: 'center', marginTop: 2,
                  }}>
                    {rs.label}
                  </span>

                  {/* Type badge (pad messages only) */}
                  {msg.role === 'pad' && tb && (
                    <span style={{
                      display: 'inline-block', padding: '2px 5px', borderRadius: 3,
                      fontSize: 9, fontWeight: 600, color: tb.color,
                      background: tb.color + '18', border: `1px solid ${tb.color}33`,
                      whiteSpace: 'nowrap', marginTop: 2,
                    }}>
                      {tb.label}
                    </span>
                  )}

                  {/* Message text */}
                  <span style={{
                    flex: 1, fontSize: 12, color: COLORS.text, lineHeight: '18px',
                    wordBreak: 'break-word',
                  }}>
                    {msg.text}
                    {msg.listings?.length > 0 && (
                      <span style={{ color: COLORS.textDim, fontSize: 11 }}>
                        {' '}({msg.listings.length} listing{msg.listings.length !== 1 ? 's' : ''} returned)
                      </span>
                    )}
                  </span>

                  {/* Timestamp */}
                  <span style={{ fontSize: 10, color: COLORS.textDim, whiteSpace: 'nowrap', marginTop: 2 }}>
                    {formatTs(msg.ts)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
