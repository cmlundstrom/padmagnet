'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, baseButton, Badge, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';

// Change these anytime to set what the panel shows on load.
const AUDIT_DEFAULTS = {
  table: "waitlist",  // "" = all tables, or "waitlist", "listings", "idx_feeds"
  action: "",         // "" = all actions, or "create", "update", "delete", "suppress", "unsuppress"
  limit: 50,          // 25, 50, or 100
};

const AUDIT_ACTION_BADGE_COLORS = {
  create: "green", invite: "green", update: "blue", delete: "red",
  reply: "purple", suppress: "amber", unsuppress: "cyan",
};

export default function AuditLogPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState(AUDIT_DEFAULTS.table);
  const [actionFilter, setActionFilter] = useState(AUDIT_DEFAULTS.action);
  const [limit, setLimit] = useState(AUDIT_DEFAULTS.limit);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tableFilter) params.set("table", tableFilter);
      if (actionFilter) params.set("action", actionFilter);
      params.set("limit", String(limit));
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (res.ok) setEntries(await res.json());
    } catch {
      // silent
    }
    setLoading(false);
  }, [tableFilter, actionFilter, limit]);

  useEffect(() => { fetchAuditLog(); }, [fetchAuditLog]);

  const columns = useMemo(() => [
    {
      accessorKey: "table_name",
      header: "Table",
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "monospace", color: COLORS.brand, fontSize: "12px" }}>{getValue()}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={AUDIT_ACTION_BADGE_COLORS[v] || "gray"}>{v}</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: "row_id",
      header: "Row ID",
      cell: ({ getValue }) => {
        const v = getValue();
        return <span style={{ fontFamily: "monospace", fontSize: "11px", color: COLORS.textDim }}>{v?.slice(0, 8)}\u2026</span>;
      },
      size: 110,
    },
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.field_changed) {
          return (
            <span style={{ fontSize: "12px", color: COLORS.textMuted }}>
              <span style={{ color: COLORS.text }}>{entry.field_changed}</span>
              {entry.old_value && entry.new_value && (
                <>: <span style={{ color: COLORS.red, textDecoration: "line-through" }}>{entry.old_value?.slice(0, 30)}</span> \u2192 <span style={{ color: COLORS.green }}>{entry.new_value?.slice(0, 30)}</span></>
              )}
            </span>
          );
        }
        if (entry.action === "create" || entry.action === "invite") return <span style={{ fontSize: "12px", color: COLORS.green }}>New entry created</span>;
        if (entry.action === "delete") return <span style={{ fontSize: "12px", color: COLORS.red }}>Entry deleted</span>;
        return <span style={{ fontSize: "12px", color: COLORS.textDim }}>\u2014</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Time",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 160,
    },
  ], []);

  const renderExpandedRow = useCallback((entry) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {[
        ["Row ID", entry.row_id || "\u2014"],
        ["Admin User", entry.admin_user_id || "system"],
        ["Field Changed", entry.field_changed || "\u2014"],
        ["Old Value", entry.old_value || "\u2014"],
        ["New Value", entry.new_value || "\u2014"],
        ["Metadata", entry.metadata ? JSON.stringify(entry.metadata) : "\u2014"],
      ].map(([label, val]) => (
        <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
          <div style={{ fontSize: "12px", color: COLORS.text, marginTop: 2, wordBreak: "break-all" }}>{val}</div>
        </div>
      ))}
    </div>
  ), []);

  return (
    <div>
      <div className="audit-panel-filters">
        <select className="audit-panel-select" value={tableFilter} onChange={e => setTableFilter(e.target.value)}>
          <option value="">All Tables</option>
          <option value="waitlist">Waitlist</option>
          <option value="tickets">Tickets</option>
          <option value="profiles">Users</option>
          <option value="listings">Listings</option>
          <option value="idx_feeds">IDX Feeds</option>
        </select>
        <select className="audit-panel-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="reply">Reply</option>
          <option value="invite">Invite</option>
          <option value="suppress">Suppress</option>
          <option value="unsuppress">Unsuppress</option>
        </select>
        <select className="audit-panel-select" value={limit} onChange={e => setLimit(Number(e.target.value))}>
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
        </select>
        <button onClick={fetchAuditLog} style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>
          Refresh
        </button>
      </div>

      <AdminTable
        columns={columns}
        data={entries}
        loading={loading}
        tableName="admin_audit_log"
        storageKey="audit-log"
        emptyMessage="No audit log entries yet. Actions taken in admin panels will appear here."
        renderExpandedRow={renderExpandedRow}
      />
    </div>
  );
}
