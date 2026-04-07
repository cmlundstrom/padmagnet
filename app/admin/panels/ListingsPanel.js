'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, baseButton, Badge, StatCard, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';
import AuditHistory from '../components/AuditHistory';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ListingsPanel() {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // { id, action: 'approve'|'reject' }
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings");
      if (!res.ok) throw new Error("Failed to load listings");
      const data = await res.json();
      setListings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const TYPE_ABBREV = { "Single Family Residence": "SFR", "Condominium": "Condo", "Townhouse": "TH", "Duplex": "Duplex", "Apartment": "Apt", "Mobile Home": "MH" };

  const STATUS_FILTERS = ["all", "pending_review", "active", "draft", "expired", "leased", "archived", "suppressed"];
  const pendingReviewCount = listings.filter(l => l.status === "pending_review").length;

  const enriched = useMemo(() => {
    return listings.map(l => {
      const dom = l.created_at ? Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000) : 0;
      return {
        ...l,
        address: [l.street_number, l.street_name].filter(Boolean).join(" ") || "\u2014",
        address_city: [l.city, l.state_or_province, l.postal_code].filter(Boolean).join(", "),
        days_on_market: dom,
        beds_baths: `${l.bedrooms_total ?? "\u2014"}/${l.bathrooms_total ?? "\u2014"}`,
        suppressed: !l.is_active,
      };
    });
  }, [listings]);

  const filtered = useMemo(() => {
    return enriched.filter(l => {
      if (statusFilter === "suppressed") {
        if (l.is_active) return false;
      } else if (statusFilter === "pending_review") {
        if (l.status !== "pending_review") return false;
      } else if (statusFilter !== "all") {
        if (l.status !== statusFilter) return false;
        if (!l.is_active) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          l.listing_id?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, statusFilter, search]);

  // Stat counts
  const totalCount = listings.length;
  const mlsCount = listings.filter(l => l.source === "mls" || l.source === "bridge").length;
  const ownerCount = listings.filter(l => l.source === "owner").length;
  const activeCount = listings.filter(l => l.status === "active" && l.is_active).length;
  const draftCount = listings.filter(l => l.status === "draft").length;
  const suppressedCount = listings.filter(l => !l.is_active).length;

  const statusCountFor = (s) => {
    if (s === "all") return enriched.length;
    if (s === "suppressed") return suppressedCount;
    return enriched.filter(l => l.status === s && l.is_active).length;
  };

  // CRUD handlers
  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchListings();
  }, [fetchListings]);

  const handleBulkDelete = useCallback((ids) => {
    setConfirmAction({
      type: "delete",
      ids,
      message: `Archive ${ids.length} listing${ids.length > 1 ? "s" : ""}? They will be set to inactive/archived.`,
    });
  }, []);

  const handleBulkSuppress = useCallback((ids) => {
    setConfirmAction({
      type: "suppress",
      ids,
      message: `Suppress ${ids.length} listing${ids.length > 1 ? "s" : ""}? They will be hidden from tenants.`,
    });
  }, []);

  const handleBulkUnsuppress = useCallback((ids) => {
    handleSave(ids, { is_active: true, status: "active" });
  }, [handleSave]);

  const handleReviewAction = useCallback(async (id, action, reason) => {
    setReviewLoading(true);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, rejection_reason: reason }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        alert(`Review failed: ${errBody.error || res.statusText}`);
      } else {
        setReviewAction(null);
        setRejectionReason("");
        fetchListings();
      }
    } catch (err) {
      alert(`Review error: ${err.message}`);
    }
    setReviewLoading(false);
  }, [fetchListings]);

  const confirmExecute = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      await fetch("/api/admin/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmAction.ids }),
      });
    } else if (confirmAction.type === "suppress") {
      await handleSave(confirmAction.ids, { is_active: false });
    }
    setConfirmAction(null);
    fetchListings();
  }, [confirmAction, handleSave, fetchListings]);

  // Column defs
  const columns = useMemo(() => [
    {
      accessorKey: "listing_id",
      header: "MLS#",
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "monospace", color: COLORS.brand, fontWeight: 600, fontSize: "12px" }}>
          {getValue() || "\u2014"}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div>
          <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>{row.original.address}</div>
          <div style={{ fontSize: "11px", color: COLORS.textDim }}>{row.original.address_city}</div>
        </div>
      ),
    },
    {
      accessorKey: "property_sub_type",
      header: "Type",
      cell: ({ getValue }) => {
        const v = getValue();
        return <span style={{ fontSize: "12px", color: COLORS.textMuted }}>{TYPE_ABBREV[v] || v || "\u2014"}</span>;
      },
      size: 80,
    },
    {
      accessorKey: "list_price",
      header: "Rent",
      cell: ({ getValue }) => {
        const v = getValue();
        return <span style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>{v ? `$${Number(v).toLocaleString()}` : "\u2014"}</span>;
      },
      size: 90,
    },
    {
      accessorKey: "beds_baths",
      header: "Bd/Ba",
      cell: ({ getValue }) => <span style={{ fontSize: "13px" }}>{getValue()}</span>,
      size: 70,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ getValue }) => {
        const v = getValue();
        const isMLS = v === "mls" || v === "bridge";
        return <Badge color={isMLS ? "blue" : "purple"}>{isMLS ? "MLS" : "OWNER"}</Badge>;
      },
      size: 80,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue();
        const statusColors = { active: "green", pending_review: "purple", draft: "amber", expired: "red", leased: "blue", archived: "gray", rejected: "red" };
        return <Badge color={statusColors[v] || "gray"}>{v}</Badge>;
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "active", label: "Active" },
          { value: "draft", label: "Draft" },
          { value: "expired", label: "Expired" },
          { value: "leased", label: "Leased" },
          { value: "archived", label: "Archived" },
        ],
      },
    },
    {
      accessorKey: "days_on_market",
      header: "DOM",
      cell: ({ getValue }) => {
        const dom = getValue();
        const color = dom <= 7 ? COLORS.green : dom <= 30 ? COLORS.text : dom <= 60 ? COLORS.amber : COLORS.red;
        return <span style={{ fontSize: "12px", color }}>{dom}d</span>;
      },
      size: 70,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 150,
    },
  ], []);

  // Expanded row
  const renderExpandedRow = useCallback((row) => {
    const handleSuppress = () => handleSave([row.id], { is_active: false });
    const handleUnsuppress = () => handleSave([row.id], { is_active: true, status: "active" });
    const photos = Array.isArray(row.photos) ? row.photos : [];
    const isPending = row.status === "pending_review";

    return (
      <div>
        {/* Quick approve/reject at TOP for pending reviews */}
        {isPending && (
          <div style={{
            display: "flex", gap: 10, alignItems: "center", padding: "12px 16px",
            background: "#7C3AED15", border: "1px solid #7C3AED33", borderRadius: 8,
            marginBottom: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#A78BFA" }}>Review Required</div>
              <div style={{ fontSize: "12px", color: COLORS.textMuted }}>
                {row.listing_agent_name || "Owner"} · {row.listing_agent_email || "No email"} · {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              onClick={() => handleReviewAction(row.id, "approve")}
              disabled={reviewLoading}
              style={{ ...baseButton, background: COLORS.green, color: "#000", fontSize: "13px", fontWeight: 700, padding: "8px 20px" }}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setReviewAction({ id: row.id, action: "reject" })}
              style={{ ...baseButton, background: COLORS.redDim, color: COLORS.red, fontSize: "13px", padding: "8px 16px" }}
            >
              ✕ Reject
            </button>
          </div>
        )}

        {/* Photo gallery for review */}
        {photos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "11px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
              Photos ({photos.length})
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {photos.map((photo, i) => {
                const photoUrl = typeof photo === 'string' ? photo : photo?.url || photo?.thumb_url;
                if (!photoUrl) return null;
                return (
                <img
                  key={i}
                  src={photoUrl}
                  alt={`Listing photo ${i + 1}`}
                  style={{
                    width: 120, height: 90, objectFit: "cover", borderRadius: 6,
                    border: `1px solid ${COLORS.border}`, cursor: "pointer",
                  }}
                  onClick={() => window.open(photoUrl, '_blank')}
                />
                );
              })}
            </div>
          </div>
        )}

        {/* Public remarks */}
        {row.public_remarks && (
          <div style={{
            marginBottom: 16, padding: "10px 12px", background: COLORS.bg, borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: "13px", color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{row.public_remarks}</div>
          </div>
        )}

        {/* Detail grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Rent", row.list_price ? `$${Number(row.list_price).toLocaleString()}/mo` : "\u2014"],
            ["Type", row.property_sub_type || row.property_type || "\u2014"],
            ["Beds/Baths", `${row.bedrooms_total ?? "\u2014"} / ${row.bathrooms_total ?? "\u2014"}`],
            ["Sqft", row.living_area ? Number(row.living_area).toLocaleString() : "\u2014"],
            ["Pets", row.pets_allowed || "\u2014"],
            ["Fenced Yard", row.fenced_yard ? "Yes" : "No"],
            ["Source", row.source || "\u2014"],
            ["DOM", `${row.days_on_market} days`],
            ["Views", row.view_count ?? 0],
            ["Inquiries", row.inquiry_count ?? 0],
            ["Photos", photos.length],
            ["Boosted", row.is_boosted ? "Yes" : "No"],
          ].map(([label, val]) => (
            <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {isPending && (
            <>
              <button
                onClick={() => handleReviewAction(row.id, "approve")}
                disabled={reviewLoading}
                style={{ ...baseButton, background: COLORS.green, color: "#000", fontSize: "12px", fontWeight: 700 }}
              >
                ✓ Approve Listing
              </button>
              <button
                onClick={() => setReviewAction({ id: row.id, action: "reject" })}
                style={{ ...baseButton, background: COLORS.redDim, color: COLORS.red, fontSize: "12px" }}
              >
                ✕ Reject
              </button>
            </>
          )}
          {!isPending && row.is_active && (
            <button onClick={handleSuppress} style={{ ...baseButton, background: COLORS.redDim, color: COLORS.red, fontSize: "12px" }}>Suppress</button>
          )}
          {!isPending && !row.is_active && row.status !== "pending_review" && (
            <button onClick={handleUnsuppress} style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "12px" }}>Unsuppress</button>
          )}
        </div>
        <AuditHistory tableName="listings" rowId={row.id} />
      </div>
    );
  }, [handleSave, handleReviewAction, reviewLoading]);

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Listings" value={totalCount} sub={`${mlsCount} MLS / ${ownerCount} owner`} accent={COLORS.brand} />
        <StatCard label="Active" value={activeCount} sub={totalCount > 0 ? `${Math.round(activeCount / totalCount * 100)}% of total` : "\u2014"} accent={COLORS.green} />
        <StatCard label="Pending Review" value={pendingReviewCount} accent={pendingReviewCount > 0 ? COLORS.purple : COLORS.green} />
        <StatCard label="Drafts" value={draftCount} accent={COLORS.amber} />
        <StatCard label="Suppressed" value={suppressedCount} sub="Hidden from tenants" accent={COLORS.red} />
      </div>

      {/* Pending Review Alert Banner */}
      {pendingReviewCount > 0 && statusFilter !== "pending_review" && (
        <div
          onClick={() => setStatusFilter("pending_review")}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
            background: "#7C3AED22", border: "1px solid #7C3AED44", borderRadius: 8,
            marginBottom: 12, cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 20 }}>📋</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#A78BFA" }}>
              {pendingReviewCount} listing{pendingReviewCount !== 1 ? "s" : ""} awaiting review
            </div>
            <div style={{ fontSize: "12px", color: COLORS.textMuted }}>Click to review and approve</div>
          </div>
          <span style={{ fontSize: "18px", color: "#A78BFA" }}>→</span>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search MLS#, address, city\u2026"
          className="audit-panel-input"
          style={{ flex: "1 1 240px" }}
        />
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            ...baseButton,
            background: statusFilter === s ? COLORS.brand + "22" : COLORS.surface,
            color: statusFilter === s ? COLORS.brand : COLORS.textMuted,
            border: `1px solid ${statusFilter === s ? COLORS.brand + "44" : COLORS.border}`,
          }}>
            {s === "all" ? "All" : s === "pending_review" ? "Pending Review" : s === "leased" ? "De-Listed" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "pending_review" && pendingReviewCount > 0 ? (
              <span style={{ marginLeft: 6, fontSize: "11px", fontWeight: 700, background: "#7C3AED", color: "#fff", borderRadius: 8, padding: "1px 6px" }}>{pendingReviewCount}</span>
            ) : (
              <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>{statusCountFor(s)}</span>
            )}
          </button>
        ))}
      </div>

      <AdminTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        tableName="listings"
        storageKey="listings"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkSuppress={handleBulkSuppress}
        onBulkUnsuppress={handleBulkUnsuppress}
        emptyMessage="No listings match your filters"
        renderExpandedRow={renderExpandedRow}
      />

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={confirmExecute}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Rejection reason dialog */}
      {reviewAction?.action === "reject" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }} onClick={() => { setReviewAction(null); setRejectionReason(""); }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: COLORS.surface, borderRadius: 12, padding: 24,
              border: `1px solid ${COLORS.border}`, width: 440, maxWidth: "90vw",
            }}
          >
            <h3 style={{ margin: "0 0 12px", color: COLORS.text, fontSize: 16, fontWeight: 700 }}>Reject Listing</h3>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 12px" }}>
              The owner will receive an email with your reason. Be specific so they can fix and resubmit.
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
              style={{
                width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                borderRadius: 6, padding: "8px 12px", color: COLORS.text, fontSize: 13,
                fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setReviewAction(null); setRejectionReason(""); }}
                style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewAction(reviewAction.id, "reject", rejectionReason)}
                disabled={reviewLoading}
                style={{ ...baseButton, background: COLORS.red, color: "#fff", fontWeight: 700, opacity: reviewLoading ? 0.6 : 1 }}
              >
                {reviewLoading ? "Rejecting..." : "Reject Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
