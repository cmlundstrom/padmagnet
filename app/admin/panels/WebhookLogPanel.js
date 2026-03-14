'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS, Badge, StatCard, formatDate, baseButton } from '../shared';

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'resend', label: 'Resend' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'processed', label: 'Processed' },
  { value: 'failed', label: 'Failed' },
  { value: 'duplicate', label: 'Duplicate' },
];

export default function WebhookLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(50);
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (source) params.set('source', source);
      if (status) params.set('status', status);
      params.set('limit', String(limit));

      const res = await fetch(`/api/admin/webhook-logs?${params}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [source, status, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Stat counts from current results
  const processed = logs.filter(l => l.status === 'processed').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const duplicates = logs.filter(l => l.status === 'duplicate').length;

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Showing" value={logs.length} sub={`of last ${limit}`} accent={COLORS.brand} />
        <StatCard label="Processed" value={processed} accent={COLORS.green} />
        <StatCard label="Failed" value={failed} accent={failed > 0 ? COLORS.red : COLORS.green} />
        <StatCard label="Duplicates" value={duplicates} accent={COLORS.amber} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select options={SOURCE_OPTIONS} value={source} onChange={setSource} />
        <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <select
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
          style={selectStyle}
        >
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
          <option value={200}>200 rows</option>
        </select>
        <button onClick={fetchLogs} style={{ ...baseButton, background: COLORS.brand, color: '#000' }}>
          Refresh
        </button>
      </div>

      {/* Log Table */}
      <div style={{
        background: COLORS.surface, borderRadius: '8px',
        border: `1px solid ${COLORS.border}`, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '90px 80px 160px 1fr 150px',
          padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
          fontSize: '11px', fontWeight: 700, color: COLORS.textDim,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>Source</span>
          <span>Status</span>
          <span>Event Type</span>
          <span>Details</span>
          <span>Time</span>
        </div>

        {loading ? (
          <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: '13px' }}>
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: '13px' }}>
            No webhook logs found
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id}>
              <div
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '90px 80px 160px 1fr 150px',
                  alignItems: 'center', padding: '10px 16px',
                  borderBottom: i < logs.length - 1 || expandedId === log.id ? `1px solid ${COLORS.border}` : 'none',
                  cursor: 'pointer',
                  background: expandedId === log.id ? COLORS.surfaceHover : 'transparent',
                }}
              >
                <Badge color={log.source === 'twilio' ? 'blue' : 'purple'}>
                  {log.source}
                </Badge>
                <Badge color={
                  log.status === 'processed' ? 'green'
                  : log.status === 'failed' ? 'red'
                  : log.status === 'duplicate' ? 'amber'
                  : 'gray'
                }>
                  {log.status}
                </Badge>
                <span style={{ fontSize: '12px', color: COLORS.text, fontFamily: 'monospace' }}>
                  {log.event_type || '—'}
                </span>
                <span style={{
                  fontSize: '12px', color: log.error_message ? COLORS.red : COLORS.textDim,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {log.error_message || log.external_id || '—'}
                </span>
                <span style={{ fontSize: '12px', color: COLORS.textDim }}>
                  {formatDate(log.created_at)}
                </span>
              </div>

              {/* Expanded payload */}
              {expandedId === log.id && (
                <div style={{
                  padding: '12px 16px',
                  background: COLORS.bg,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
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
  );
}

function Select({ options, value, onChange }) {
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
