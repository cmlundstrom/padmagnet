'use client';

/**
 * FlagsSubview — admin queue for content_reports rows.
 *
 * Lives inside SupportPanel under the "Flags" sub-tab. Shows open user-
 * submitted reports against listings/users/messages/conversations, with
 * per-row action buttons:
 *   - Dismiss          (admin determined the flag was a non-issue)
 *   - Hide content     (only for content_type='listing' — sets is_active=false)
 *   - Ban user         (only for content_type='user' — archives the target)
 *   - Escalate         (sets status='triaged', no automated mutation —
 *                       used to flag for legal review)
 *
 * All actions hit POST /api/admin/reports/[id] which audit-logs via
 * the canonical writeAuditLogBatch helper. Free-text notes optional on
 * any action; resolution_action + status are set server-side.
 */

import { useState, useEffect, useCallback } from 'react';
import { COLORS, baseButton, Badge, StatCard, timeAgo } from '../shared';
import ConfirmDialog from '../components/ConfirmDialog';

const REASON_LABELS = {
  spam: 'Spam',
  fake_listing: 'Fake / misleading',
  scam: 'Scam',
  harassment: 'Harassment / abuse',
  sexual_content: 'Sexual content',
  hate_speech: 'Hate speech',
  illegal: 'Illegal activity',
  other: 'Other',
};

const REASON_COLORS = {
  spam: 'gray',
  fake_listing: 'amber',
  scam: 'red',
  harassment: 'red',
  sexual_content: 'red',
  hate_speech: 'red',
  illegal: 'red',
  other: 'gray',
};

const STATUS_COLORS = {
  open: 'amber',
  triaged: 'cyan',
  resolved: 'green',
  dismissed: 'gray',
};

const CONTENT_TYPE_ICONS = {
  listing: '🏠',
  user: '👤',
  message: '💬',
  conversation: '💬',
};

export default function FlagsSubview() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('content_type', typeFilter);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load reports: ${res.status}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const requestAction = (report, action, message, showReason = false) => {
    setPendingAction({ report, action, message, showReason });
  };

  const executeAction = useCallback(async (notes) => {
    if (!pendingAction) return;
    const { report, action } = pendingAction;
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setPendingAction(null);
      fetchReports();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
      setPendingAction(null);
    }
  }, [pendingAction, fetchReports]);

  // Counts for stat cards (against full unfiltered data ideally — for v1
  // we just count what's loaded under current filters)
  const openCount = reports.filter(r => r.status === 'open').length;
  const triagedCount = reports.filter(r => r.status === 'triaged').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Open" value={openCount} sub="Awaiting review" accent={COLORS.amber} />
        <StatCard label="Triaged" value={triagedCount} sub="Escalated for legal" accent={COLORS.cyan || COLORS.brand} />
        <StatCard label="Resolved" value={resolvedCount} sub="Action taken" accent={COLORS.green} />
        <StatCard label="Dismissed" value={dismissedCount} sub="No action needed" accent={COLORS.textDim} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: COLORS.textDim, marginRight: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</span>
        {['open', 'triaged', 'resolved', 'dismissed', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              ...baseButton,
              background: statusFilter === s ? COLORS.brand + '22' : COLORS.surface,
              color: statusFilter === s ? COLORS.brand : COLORS.textMuted,
              border: `1px solid ${statusFilter === s ? COLORS.brand + '44' : COLORS.border}`,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ fontSize: 12, color: COLORS.textDim, marginLeft: 16, marginRight: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</span>
        {['all', 'listing', 'user', 'message', 'conversation'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              ...baseButton,
              background: typeFilter === t ? COLORS.brand + '22' : COLORS.surface,
              color: typeFilter === t ? COLORS.brand : COLORS.textMuted,
              border: `1px solid ${typeFilter === t ? COLORS.brand + '44' : COLORS.border}`,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          onClick={fetchReports}
          style={{ ...baseButton, marginLeft: 'auto', background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 12, background: COLORS.red + '22', border: `1px solid ${COLORS.red}44`, borderRadius: 6, color: COLORS.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: COLORS.textDim }}>Loading reports…</div>
      ) : reports.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: COLORS.textDim, background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
          No reports match the current filter. {statusFilter === 'open' ? 'All clear — no open flags.' : null}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(r => (
            <ReportRow
              key={r.id}
              report={r}
              onAction={requestAction}
            />
          ))}
        </div>
      )}

      {pendingAction && (
        <ConfirmDialog
          message={pendingAction.message}
          showReason={pendingAction.showReason}
          onConfirm={executeAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Per-row card — header (type, reason, age, status) + body (target,
// reporter, free-text) + footer (action buttons).
// ────────────────────────────────────────────────────────────────────
function ReportRow({ report, onAction }) {
  const isOpen = report.status === 'open';
  const isListing = report.content_type === 'listing';
  const isUser = report.content_type === 'user';

  const targetLine = (() => {
    if (!report.target) return <span style={{ color: COLORS.textDim }}>{report.content_type} · <code style={{ fontSize: 11 }}>{report.content_id.slice(0, 8)}…</code> (target lookup failed)</span>;
    if (report.target.type === 'listing') {
      return (
        <span>
          {CONTENT_TYPE_ICONS.listing} <strong>{report.target.address}</strong>
          <span style={{ color: COLORS.textDim, marginLeft: 8, fontSize: 12 }}>
            {report.target.source === 'mls' ? 'MLS' : 'Owner-listed'}
          </span>
        </span>
      );
    }
    if (report.target.type === 'user') {
      return (
        <span>
          {CONTENT_TYPE_ICONS.user} <strong>{report.target.display_name}</strong>
          <span style={{ color: COLORS.textDim, marginLeft: 8, fontSize: 12 }}>{report.target.email}</span>
          {report.target.role === 'super_admin' && (
            <Badge color="purple" style={{ marginLeft: 8 }}>super_admin</Badge>
          )}
        </span>
      );
    }
    return null;
  })();

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <Badge color={REASON_COLORS[report.reason_code] || 'gray'}>
          {REASON_LABELS[report.reason_code] || report.reason_code}
        </Badge>
        <Badge color={STATUS_COLORS[report.status] || 'gray'}>{report.status}</Badge>
        <span style={{ fontSize: 12, color: COLORS.textDim }}>{timeAgo(report.created_at)}</span>
        <code style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.textDim }}>{report.id.slice(0, 8)}</code>
      </div>

      <div style={{ marginBottom: 6, color: COLORS.text }}>{targetLine}</div>

      <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 10 }}>
        Reported by{' '}
        {report.reporter_email ? (
          <span style={{ color: COLORS.text }}>{report.reporter_name || ''} <span style={{ color: COLORS.textDim }}>{report.reporter_email}</span></span>
        ) : (
          <span style={{ fontStyle: 'italic' }}>(reporter deleted)</span>
        )}
      </div>

      {report.free_text && (
        <div style={{ background: COLORS.bg, borderLeft: `3px solid ${COLORS.amber}`, borderRadius: '0 6px 6px 0', padding: '10px 14px', marginBottom: 10, color: COLORS.text, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {report.free_text}
        </div>
      )}

      {report.resolution_action && (
        <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 10 }}>
          Resolved · <strong>{report.resolution_action}</strong>
          {report.resolution_notes && <> · "{report.resolution_notes}"</>}
        </div>
      )}

      {isOpen && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={{ ...baseButton, background: COLORS.green + '22', color: COLORS.green, border: `1px solid ${COLORS.green}44` }}
            onClick={() => onAction(report, 'dismiss', `Dismiss this report as a non-issue?`, true)}
          >
            ✓ Dismiss (non-issue)
          </button>
          {isListing && (
            <button
              style={{ ...baseButton, background: COLORS.amber + '22', color: COLORS.amber, border: `1px solid ${COLORS.amber}44` }}
              onClick={() => onAction(report, 'hide_content', `Hide this listing? It will be set inactive and removed from the swipe deck.`, true)}
            >
              👁 Hide listing
            </button>
          )}
          {isUser && (
            <button
              style={{ ...baseButton, background: COLORS.red + '22', color: COLORS.red, border: `1px solid ${COLORS.red}44` }}
              onClick={() => onAction(report, 'ban_user', `Ban this user? Their profile will be archived. This is reversible by un-archiving.`, true)}
            >
              🚫 Ban user
            </button>
          )}
          <button
            style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, marginLeft: 'auto' }}
            onClick={() => onAction(report, 'escalate', `Escalate to legal review? Status moves to triaged. No automated content/user mutation.`, true)}
          >
            ⚖ Escalate
          </button>
        </div>
      )}
    </div>
  );
}
