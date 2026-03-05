'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, baseButton, Badge, StatCard, timeAgo, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';
import AddEntryForm from '../components/AddEntryForm';
import ConfirmDialog from '../components/ConfirmDialog';
import exportCSV from '../components/CSVExport';

export default function WaitlistPanel() {
  const [entries, setEntries] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // active | suppressed | all
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, ids, message, showReason }

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/waitlist");
      if (!res.ok) throw new Error("Failed to load waitlist");
      const data = await res.json();
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (statusFilter === "active" && e.suppressed) return false;
      if (statusFilter === "suppressed" && !e.suppressed) return false;
      return true;
    });
  }, [entries, roleFilter, statusFilter]);

  const tenantCount = entries.filter(e => e.role === "tenant").length;
  const landlordCount = entries.filter(e => e.role === "landlord").length;
  const suppressedCount = entries.filter(e => e.suppressed).length;

  // CRUD handlers
  const handleAddEntry = useCallback(async (values) => {
    const res = await fetch("/api/admin/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setShowAddForm(false);
      fetchWaitlist();
    }
  }, [fetchWaitlist]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchWaitlist();
  }, [fetchWaitlist]);

  const handleBulkDelete = useCallback((ids) => {
    setConfirmAction({
      type: "delete",
      ids,
      message: `Permanently delete ${ids.length} waitlist entry${ids.length > 1 ? "ies" : "y"}?`,
      showReason: false,
    });
  }, []);

  const handleBulkSuppress = useCallback((ids) => {
    setConfirmAction({
      type: "suppress",
      ids,
      message: `Suppress ${ids.length} waitlist entry${ids.length > 1 ? "ies" : "y"}? They will be hidden from active view.`,
      showReason: true,
    });
  }, []);

  const handleBulkUnsuppress = useCallback((ids) => {
    handleSave(ids, { suppressed: false, suppressed_reason: null });
  }, [handleSave]);

  const confirmExecute = useCallback(async (reason) => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      await fetch("/api/admin/waitlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmAction.ids }),
      });
    } else if (confirmAction.type === "suppress") {
      await handleSave(confirmAction.ids, { suppressed: true, suppressed_reason: reason || null });
    }
    setConfirmAction(null);
    fetchWaitlist();
  }, [confirmAction, handleSave, fetchWaitlist]);

  const handleExportCSV = useCallback(() => {
    const cols = [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "suppressed", header: "Suppressed" },
      { accessorKey: "notes", header: "Notes" },
      { accessorKey: "tags", header: "Tags" },
      { accessorKey: "created_at", header: "Signed Up" },
    ];
    exportCSV(cols, filtered, `padmagnet-waitlist-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filtered]);

  // Column defs for AdminTable
  const columns = useMemo(() => [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 500 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "landlord" ? "purple" : "cyan"}>{v}</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: "suppressed",
      header: "Status",
      cell: ({ getValue, row }) => {
        if (getValue()) {
          return (
            <span title={row.original.suppressed_reason || ""} className="suppressed-badge">
              Suppressed
            </span>
          );
        }
        return <Badge color="green">Active</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: "created_at",
      header: "Signed Up",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 180,
    },
  ], []);

  const addFormFields = [
    { key: "email", label: "Email", type: "email", placeholder: "user@example.com", required: true },
    { key: "role", label: "Role", type: "select", required: true, options: [
      { value: "tenant", label: "Tenant" },
      { value: "landlord", label: "Landlord" },
    ]},
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional notes\u2026" },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Signups" value={entries.length} sub="Since launch" accent={COLORS.brand} />
        <StatCard label="Tenants" value={tenantCount} sub={entries.length > 0 ? `${Math.round(tenantCount / entries.length * 100)}% of signups` : "\u2014"} accent={COLORS.green} />
        <StatCard label="Landlords" value={landlordCount} sub={entries.length > 0 ? `${Math.round(landlordCount / entries.length * 100)}% of signups` : "\u2014"} accent={COLORS.purple} />
        <StatCard label="Last Signup" value={entries[0] ? timeAgo(entries[0].created_at) : "\u2014"} sub={entries[0]?.email?.split("@")[0] + "\u2026" || "\u2014"} accent={COLORS.amber} />
      </div>

      {/* Filters & Actions Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "tenant", "landlord"].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{
            ...baseButton,
            background: roleFilter === r ? COLORS.brand + "22" : COLORS.surface,
            color: roleFilter === r ? COLORS.brand : COLORS.textMuted,
            border: `1px solid ${roleFilter === r ? COLORS.brand + "44" : COLORS.border}`,
          }}>
            {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
            <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>
              {r === "all" ? entries.length : entries.filter(e => e.role === r).length}
            </span>
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />
        {["active", "suppressed", "all"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            ...baseButton,
            background: statusFilter === s ? (s === "suppressed" ? COLORS.amberDim + "44" : COLORS.brand + "22") : COLORS.surface,
            color: statusFilter === s ? (s === "suppressed" ? COLORS.amber : COLORS.brand) : COLORS.textMuted,
            border: `1px solid ${statusFilter === s ? (s === "suppressed" ? COLORS.amber + "44" : COLORS.brand + "44") : COLORS.border}`,
          }}>
            {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "suppressed" && <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>{suppressedCount}</span>}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            ...baseButton, background: COLORS.brand, color: "#000", fontWeight: 700,
          }}>
            + Add Signup
          </button>
          <button onClick={handleExportCSV} style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <AddEntryForm
          fields={addFormFields}
          onSave={handleAddEntry}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Admin Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        tableName="waitlist"
        storageKey="waitlist"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkSuppress={handleBulkSuppress}
        onBulkUnsuppress={handleBulkUnsuppress}
        emptyMessage="No waitlist entries"
      />

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          showReason={confirmAction.showReason}
          onConfirm={confirmExecute}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
