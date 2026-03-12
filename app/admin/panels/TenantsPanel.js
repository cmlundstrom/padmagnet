'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, Badge, StatCard, timeAgo, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';

export default function TenantsPanel() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users?role=tenant");
      if (!res.ok) throw new Error("Failed to load tenants");
      const data = await res.json();
      setTenants(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchTenants();
  }, [fetchTenants]);

  const handleBulkDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const t = tenants.find(t => t.id === id);
      return t ? `${t.display_name || t.email}` : id;
    }).join(", ");
    setConfirmDelete({ ids, names });
  }, [tenants]);

  const executeDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: confirmDelete.ids }),
    });
    if (!res.ok) {
      const result = await res.json();
      alert(`Delete failed: ${result.error}`);
    }
    setConfirmDelete(null);
    fetchTenants();
  }, [confirmDelete, fetchTenants]);

  // Auth status helper
  const getAuthStatus = (authStatus) => {
    if (!authStatus) return { label: "Active", color: COLORS.green, bg: "#052e16" };
    if (authStatus.last_sign_in_at) return { label: "Active", color: "#4ade80", bg: "#052e16" };
    if (authStatus.email_confirmed_at) return { label: "Confirmed", color: COLORS.brand, bg: "#042f2e" };
    return { label: "Unconfirmed", color: COLORS.textDim, bg: "#1e293b" };
  };

  const columns = useMemo(() => [
    {
      accessorKey: "display_name",
      header: "Name",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600 }}>{getValue() || "\u2014"}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 500 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "13px", color: getValue() ? COLORS.text : COLORS.textDim }}>
          {getValue() || "Not set"}
        </span>
      ),
      meta: { editable: true },
      size: 140,
    },
    {
      id: "auth_status",
      header: "Status",
      accessorFn: (row) => row.auth_status,
      cell: ({ row }) => {
        const s = getAuthStatus(row.original.auth_status);
        return (
          <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 6,
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.02em",
            background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
          }}>
            {s.label}
          </span>
        );
      },
      size: 120,
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 160,
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{timeAgo(getValue())}</span>
      ),
      size: 100,
    },
  ], []);

  const recentCount = tenants.filter(t => {
    const diff = Date.now() - new Date(t.created_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // last 7 days
  }).length;

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Tenants" value={tenants.length} sub="Registered accounts" accent={COLORS.brand} />
        <StatCard label="New (7d)" value={recentCount} sub="Last 7 days" accent={COLORS.green} />
        <StatCard
          label="Last Signup"
          value={tenants.length > 0 ? timeAgo(tenants[tenants.length - 1]?.created_at) : "\u2014"}
          sub={tenants[tenants.length - 1]?.display_name || "\u2014"}
          accent={COLORS.amber}
        />
      </div>

      <span style={{ fontSize: "13px", color: COLORS.textMuted, display: "block", marginBottom: 16 }}>
        Double-click any cell to edit. Changes are saved immediately and logged to the audit trail.
      </span>

      {/* Tenants Table */}
      <AdminTable
        columns={columns}
        data={tenants}
        loading={loading}
        error={error}
        tableName="profiles"
        storageKey="tenants"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        emptyMessage="No tenant accounts yet"
      />

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Delete {confirmDelete.ids.length} tenant{confirmDelete.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              {confirmDelete.names}
            </p>
            <div style={{
              padding: "10px 14px", marginTop: 12, marginBottom: 16, borderRadius: 8,
              background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)",
              fontSize: "12px", color: "#f87171", lineHeight: 1.5,
            }}>
              DANGER: This permanently deletes the tenant account AND their Supabase auth account.
              All swipes, preferences, and conversations will be lost. This action cannot be undone.
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="confirm-btn confirm"
                style={{ background: "#dc2626" }}
                onClick={executeDelete}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
