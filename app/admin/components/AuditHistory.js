'use client';

import { useState, useEffect } from 'react';

const ACTION_COLORS = {
  create: '#22c55e',
  update: '#3b82f6',
  delete: '#ef4444',
  suppress: '#f59e0b',
  unsuppress: '#22d3ee',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function AuditHistory({ tableName, rowId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudit() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tableName) params.set('table', tableName);
        if (rowId) params.set('row_id', rowId);
        params.set('limit', '20');
        const res = await fetch(`/api/admin/audit-log?${params}`);
        if (res.ok) {
          setEntries(await res.json());
        }
      } catch {
        // silent
      }
      setLoading(false);
    }
    fetchAudit();
  }, [tableName, rowId]);

  if (loading) return <div className="audit-loading">Loading history…</div>;
  if (!entries.length) return <div className="audit-empty">No history yet</div>;

  return (
    <div className="audit-history">
      {entries.map(entry => (
        <div key={entry.id} className="audit-entry">
          <span
            className="audit-action-badge"
            style={{ background: (ACTION_COLORS[entry.action] || '#64748b') + '22', color: ACTION_COLORS[entry.action] || '#64748b', border: `1px solid ${(ACTION_COLORS[entry.action] || '#64748b')}44` }}
          >
            {entry.action}
          </span>
          {entry.field_changed && (
            <span className="audit-field">
              {entry.field_changed}
              {entry.old_value != null && entry.new_value != null && (
                <>: <span className="audit-old">{entry.old_value}</span> → <span className="audit-new">{entry.new_value}</span></>
              )}
            </span>
          )}
          <span className="audit-time">{formatTimestamp(entry.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
