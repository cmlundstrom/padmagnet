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
            title="Mark this report as reviewed with no action taken. The reported listing/user is NOT affected. Use when admin determines the flag is invalid or doesn't warrant action."
            onClick={() => onAction(
              report,
              'dismiss',
              `Dismiss this report as a NON-ISSUE?\n\n• Marks the report as reviewed with no action taken.\n• The reported ${report.content_type} is NOT affected — listing stays live, user keeps their access.\n• Use when admin reviews the flag and determines it's invalid or doesn't warrant action.\n\nReversible: un-dismiss by re-opening the report from the Dismissed filter (manual SQL for now until v1.0.2).`,
              true
            )}
          >
            ✓ Dismiss — non-issue
          </button>

          {isListing && (
            <button
              style={{ ...baseButton, background: COLORS.amber + '22', color: COLORS.amber, border: `1px solid ${COLORS.amber}44` }}
              title="Sets listings.is_active=false. Removes the listing from EVERY user's swipe deck, search results, and detail pages across the entire platform. Reversible via Admin > Listings."
              onClick={() => onAction(
                report,
                'hide_content',
                `Hide this listing GLOBALLY?\n\n• Sets listings.is_active=false on the database.\n• The listing will disappear from EVERY user's swipe deck, EVERY search result, and EVERY listing detail page across the entire PadMagnet platform.\n• No renter will be able to view or contact this property.\n• The owner's view of their own listing in the My Listings tab is unaffected — they can re-publish from there.\n\nReversible: Admin > Listings → find the row → toggle active back on. Or the owner can re-publish from their Listings tab.`,
                true
              )}
            >
              👁 Hide listing globally
            </button>
          )}

          {isUser && (
            <button
              style={{ ...baseButton, background: COLORS.red + '22', color: COLORS.red, border: `1px solid ${COLORS.red}44` }}
              title="Archives the REPORTED user's profile platform-wide. They lose all access — cannot sign in or use the app. Super_admin protected. Reversible via Admin > Users."
              onClick={() => onAction(
                report,
                'ban_user',
                `Ban the REPORTED user (the TARGET of this flag)?\n\n• Sets profiles.archived_at on the reported user's profile (NOT the reporter).\n• They lose platform-wide access immediately — cannot sign in or use the app.\n• Their listings (if any) remain visible unless separately hidden.\n• Super_admin accounts are protected — this action will fail on them.\n\nReversible: Admin > Users → find the user → un-archive.`,
                true
              )}
            >
              🚫 Ban target user
            </button>
          )}

          {/* Ban the user who SUBMITTED the report — distinct from ban_user.
              Available on every open report regardless of content_type, since
              any reporter can be abusive (serial false-flagging, harassment
              via reports, etc.). Only hidden when reporter_id is null. */}
          {report.reporter_id && (
            <button
              style={{ ...baseButton, background: COLORS.red + '22', color: COLORS.red, border: `1px dashed ${COLORS.red}66` }}
              title="Archives the user who SUBMITTED this report (not the target). Use when the reporter is abusing the flag system: serial false-flagging, harassment via reports, etc. Super_admin protected. Reversible via Admin > Users."
              onClick={() => onAction(
                report,
                'ban_reporter',
                `Ban the REPORTER (the user who SUBMITTED this flag)?\n\n• Sets profiles.archived_at on the REPORTER (${report.reporter_email || 'this user'}), NOT the target of the report.\n• They lose platform-wide access — cannot sign in or use the app.\n• Use when the reporter is abusing the flag system: serial false-flagging, harassment via reports, weaponizing the report flow against legit listings/users.\n• The reported listing/${report.content_type === 'listing' ? 'listing' : 'user'} is NOT affected by this action — handle that separately if needed.\n• Super_admin accounts are protected.\n\nReversible: Admin > Users → find the reporter → un-archive.`,
                true
              )}
            >
              🚫 Ban reporter
            </button>
          )}

          <button
            style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, marginLeft: 'auto' }}
            title="Status moves to triaged — keeps the report alive and out of the open queue, but takes no automated action on the listing/user. Use for ambiguous cases needing legal/human judgment before action."
            onClick={() => onAction(
              report,
              'escalate',
              `Escalate this report for LEGAL REVIEW?\n\n• Status moves from 'open' to 'triaged'.\n• Report stays in the queue (filterable under the Triaged status), but is removed from the default Open view.\n• NO automated mutation on the listing/user — nothing is hidden, nobody is banned.\n• Use for ambiguous cases that need legal/human judgment before action (e.g., possible fraud requiring evidence collection, threats requiring law-enforcement coordination, defamation claims).`,
              true
            )}
          >
            ⚖ Escalate to legal
          </button>
        </div>
      )}
    </div>
  );
}
