'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, Badge, StatCard, timeAgo, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';

export default function OwnersPanel() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users?role=owner");
      if (!res.ok) throw new Error("Failed to load owners");
      const data = await res.json();
      setOwners(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchOwners();
  }, [fetchOwners]);

  const handleBulkDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const o = owners.find(o => o.id === id);
      return o ? `${o.display_name || o.email}` : id;
    }).join(", ");
    setConfirmDelete({ ids, names });
  }, [owners]);

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
    fetchOwners();
  }, [confirmDelete, fetchOwners]);

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
      id: "listings",
      header: "Listings",
      accessorFn: (row) => row.listing_counts?.total || 0,
      cell: ({ row }) => {
        const counts = row.original.listing_counts || { total: 0, active: 0 };
        if (counts.total === 0) {
          return <span style={{ fontSize: "13px", color: COLORS.textDim }}>None</span>;
        }
        return (
          <span style={{ fontSize: "13px" }}>
            <span style={{ color: COLORS.green, fontWeight: 600 }}>{counts.active}</span>
            <span style={{ color: COLORS.textDim }}> / {counts.total}</span>
          </span>
        );
      },
      size: 90,
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

  const activeListingOwners = owners.filter(o => o.listing_counts?.active > 0).length;

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Owners" value={owners.length} sub="Registered accounts" accent={COLORS.brand} />
        <StatCard label="Active Listings" value={activeListingOwners} sub="Owners with active listing" accent={COLORS.green} />
        <StatCard
          label="Last Signup"
          value={owners.length > 0 ? timeAgo(owners[owners.length - 1]?.created_at) : "\u2014"}
          sub={owners[owners.length - 1]?.display_name || "\u2014"}
          accent={COLORS.amber}
        />
      </div>

      <span style={{ fontSize: "13px", color: COLORS.textMuted, display: "block", marginBottom: 16 }}>
        Double-click any cell to edit. Listings column shows active / total. Changes are logged to the audit trail.
      </span>

      {/* Owners Table */}
      <AdminTable
        columns={columns}
        data={owners}
        loading={loading}
        error={error}
        tableName="profiles"
        storageKey="owners"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        emptyMessage="No owner accounts yet"
      />

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Delete {confirmDelete.ids.length} owner{confirmDelete.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              {confirmDelete.names}
            </p>
            <div style={{
              padding: "10px 14px", marginTop: 12, marginBottom: 16, borderRadius: 8,
              background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)",
              fontSize: "12px", color: "#f87171", lineHeight: 1.5,
            }}>
              DANGER: This permanently deletes the owner account AND their Supabase auth account.
              Their listings will become orphaned (no owner). This action cannot be undone.
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
