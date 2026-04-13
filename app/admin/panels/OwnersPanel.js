'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, Badge, StatCard, baseButton, timeAgo, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';
import AuditHistory from '../components/AuditHistory';

export default function OwnersPanel() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [refundModal, setRefundModal] = useState(null); // { owner_user_id, payment }
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [payments, setPayments] = useState({}); // owner_id -> payments[]

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
      accessorKey: "tier",
      header: "Tier",
      cell: ({ getValue, row }) => {
        const tier = getValue() || "free";
        const colors = { free: "gray", pro: "blue", premium: "purple" };
        const expires = row.original.tier_expires_at;
        const isExpired = expires && new Date(expires) < new Date();
        return (
          <div>
            <Badge color={isExpired ? "red" : colors[tier] || "gray"}>{tier.toUpperCase()}</Badge>
            {expires && !isExpired && (
              <div style={{ fontSize: "10px", color: COLORS.textDim, marginTop: 2 }}>
                exp {new Date(expires).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
      size: 90,
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ getValue }) => {
        const roles = getValue() || [];
        return (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {roles.map(r => (
              <span key={r} style={{
                display: "inline-block", padding: "1px 6px", borderRadius: 4,
                fontSize: "10px", fontWeight: 600, letterSpacing: "0.03em",
                background: r === "admin" ? "#7C3AED22" : r === "owner" ? "#3B82F622" : "#22C55E22",
                color: r === "admin" ? "#7C3AED" : r === "owner" ? "#3B82F6" : "#22C55E",
              }}>{r}</span>
            ))}
          </div>
        );
      },
      size: 120,
    },
    {
      id: "stripe",
      header: "Stripe",
      accessorFn: (row) => row.stripe_customer_id,
      cell: ({ row }) => {
        const cid = row.original.stripe_customer_id;
        if (!cid) return <span style={{ fontSize: "12px", color: COLORS.textDim }}>—</span>;
        return (
          <a
            href={`https://dashboard.stripe.com/customers/${cid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "12px", color: COLORS.brand, textDecoration: "none" }}
            onClick={e => e.stopPropagation()}
          >
            View →
          </a>
        );
      },
      size: 70,
      enableSorting: false,
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

  // Fetch payments for an owner (on expand)
  const fetchPayments = useCallback(async (ownerId) => {
    if (payments[ownerId]) return;
    try {
      const supabase = (await import('../../../lib/supabase-browser')).createSupabaseBrowser();
      // We'll use admin API — but payments table may not have an admin route yet
      // For now, show stripe link as primary action
    } catch { /* silent */ }
  }, [payments]);

  const handleRefund = useCallback(async () => {
    if (!refundModal) return;
    setRefundLoading(true);
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_user_id: refundModal.owner_user_id,
          payment_id: refundModal.payment.id,
          reason: refundReason,
        }),
      });
      if (res.ok) {
        setRefundModal(null);
        setRefundReason("");
        alert("Refund processed successfully. Owner will receive a confirmation email.");
      } else {
        const data = await res.json();
        alert(`Refund failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Refund failed: ${err.message}`);
    }
    setRefundLoading(false);
  }, [refundModal, refundReason]);

  const renderExpandedRow = useCallback((row) => {
    const stripeUrl = row.stripe_customer_id
      ? `https://dashboard.stripe.com/customers/${row.stripe_customer_id}`
      : null;

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Tier", (row.tier || "free").toUpperCase()],
            ["Tier Started", row.tier_started_at ? formatDate(row.tier_started_at) : "—"],
            ["Tier Expires", row.tier_expires_at ? formatDate(row.tier_expires_at) : "—"],
            ["Stripe Customer", row.stripe_customer_id || "None"],
            ["Active Listings", row.listing_counts?.active || 0],
            ["Total Listings", row.listing_counts?.total || 0],
          ].map(([label, val]) => (
            <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {stripeUrl && (
            <a href={stripeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button style={{ ...baseButton, background: "#635bff", color: "#fff", fontSize: "12px" }}>
                Open in Stripe →
              </button>
            </a>
          )}
          {stripeUrl && (
            <a href={`${stripeUrl}#payments`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, fontSize: "12px" }}>
                View Payments
              </button>
            </a>
          )}
        </div>

        <AuditHistory tableName="profiles" rowId={row.id} />
      </div>
    );
  }, []);

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
        renderExpandedRow={renderExpandedRow}
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
