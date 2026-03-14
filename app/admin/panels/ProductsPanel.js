'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, baseButton, Badge, StatCard, formatDateFull } from '../shared';
import AdminTable from '../components/AdminTable';
import AddEntryForm from '../components/AddEntryForm';
import AuditHistory from '../components/AuditHistory';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ProductsPanel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null);
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSave = useCallback(async (ids, changes) => {
    if (changes.price_cents !== undefined) {
      const dollars = parseFloat(changes.price_cents);
      if (!isNaN(dollars)) {
        changes.price_cents = Math.round(dollars * 100);
      }
    }
    // Footnote edits merge into metadata jsonb
    if (changes.footnote !== undefined) {
      const footnoteVal = changes.footnote;
      delete changes.footnote;
      // Merge into each product's existing metadata
      for (const id of ids) {
        const existing = products.find(p => p.id === id);
        const merged = { ...(existing?.metadata || {}), footnote: footnoteVal || null };
        await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id], changes: { ...changes, metadata: merged } }),
        });
      }
      fetchProducts();
      return;
    }
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchProducts();
  }, [fetchProducts, products]);

  const handleToggle = useCallback(async (id, field, currentValue) => {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], changes: { [field]: !currentValue } }),
    });
    fetchProducts();
  }, [fetchProducts]);

  const handleAdd = useCallback(async (values) => {
    const priceCents = Math.round(parseFloat(values.price) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      alert("Price must be a positive number");
      return;
    }
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        description: values.description || null,
        price_cents: priceCents,
        type: values.type || "one_time",
        recurring_interval: values.type === "recurring" ? (values.recurring_interval || "month") : null,
        sort_order: parseInt(values.sort_order, 10) || 0,
        audience: values.audience || "owner",
        app_path: values.app_path || null,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(`Create failed: ${result.error}`);
      return;
    }
    setShowAddForm(false);
    fetchProducts();
  }, [fetchProducts]);

  // Suppress (set is_active = false — hidden from app, preserved in DB)
  const handleBulkSuppress = useCallback((ids) => {
    const names = ids.map(id => products.find(p => p.id === id)?.name || id).join(", ");
    setConfirmAction({
      type: "suppress",
      ids,
      message: `Suppress ${ids.length} product${ids.length > 1 ? "s" : ""}?\n\n${names}\n\nSuppressed products are hidden from all app displays but remain in the catalog for redeployment.`,
    });
  }, [products]);

  // Unsuppress (set is_active = true — visible in app again)
  const handleBulkUnsuppress = useCallback((ids) => {
    handleSave(ids, { is_active: true });
  }, [handleSave]);

  // Soft delete (deactivate)
  const handleBulkDelete = useCallback((ids) => {
    const names = ids.map(id => products.find(p => p.id === id)?.name || id).join(", ");
    setConfirmAction({
      type: "delete",
      ids,
      message: `Deactivate ${ids.length} product${ids.length > 1 ? "s" : ""}?\n\n${names}\n\nProducts will be deactivated (soft delete), not permanently removed.`,
    });
  }, [products]);

  // Hard delete (permanent removal)
  const handleBulkHardDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const p = products.find(p => p.id === id);
      return p ? p.name : id;
    });
    setHardDeleteConfirm({ ids, names, typedName: "" });
  }, [products]);

  const confirmExecute = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "suppress") {
      await handleSave(confirmAction.ids, { is_active: false });
    } else if (confirmAction.type === "delete") {
      for (const id of confirmAction.ids) {
        await fetch("/api/admin/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }
      fetchProducts();
    }
    setConfirmAction(null);
  }, [confirmAction, handleSave, fetchProducts]);

  const executeHardDelete = useCallback(async () => {
    if (!hardDeleteConfirm) return;
    for (const id of hardDeleteConfirm.ids) {
      await fetch("/api/admin/products?hard=true", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
    setHardDeleteConfirm(null);
    fetchProducts();
  }, [hardDeleteConfirm, fetchProducts]);

  const addFormFields = useMemo(() => [
    { key: "name", label: "Product Name", type: "text", required: true, placeholder: "e.g. Premium 30-Day Listing" },
    { key: "audience", label: "Audience", type: "select", required: true, options: [{ value: "owner", label: "Owner" }, { value: "tenant", label: "Tenant" }], defaultValue: "owner" },
    { key: "description", label: "Description (200 char max)", type: "textarea", placeholder: "Public-facing description. Use \\n for line breaks.", maxLength: 200 },
    { key: "app_path", label: "In-App Path", type: "text", placeholder: "e.g. /my-listings" },
    { key: "price", label: "Price ($)", type: "text", required: true, placeholder: "e.g. 29.99" },
    { key: "type", label: "Type", type: "select", options: [{ value: "one_time", label: "One-Time" }, { value: "recurring", label: "Recurring" }] },
    { key: "recurring_interval", label: "Interval", type: "select", options: [{ value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }] },
    { key: "sort_order", label: "Sort Order", type: "text", placeholder: "0" },
  ], []);

  // Enrich data with suppressed flag (for AdminTable row styling)
  const enriched = useMemo(() => {
    return products.map(p => ({
      ...p,
      suppressed: !p.is_active,
    }));
  }, [products]);

  // Filter by status and search
  const STATUS_FILTERS = ["all", "active", "suppressed", "owner", "tenant"];

  const filtered = useMemo(() => {
    return enriched.filter(p => {
      // Status filter
      switch (statusFilter) {
        case "active":
          if (!p.is_active) return false;
          break;
        case "suppressed":
          if (p.is_active) return false;
          break;
        case "owner":
          if ((p.audience || "owner") !== "owner") return false;
          break;
        case "tenant":
          if (p.audience !== "tenant") return false;
          break;
        default: // "all"
          break;
      }
      // Search
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.app_path?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, statusFilter, search]);

  // Stat counts
  const totalCount = products.length;
  const activeCount = products.filter(p => p.is_active).length;
  const suppressedCount = products.filter(p => !p.is_active).length;
  const implementedCount = products.filter(p => p.is_implemented).length;
  const avgPrice = totalCount > 0
    ? (products.reduce((sum, p) => sum + p.price_cents, 0) / totalCount / 100).toFixed(2)
    : "0.00";

  const statusCountFor = (s) => {
    switch (s) {
      case "all": return totalCount;
      case "active": return activeCount;
      case "suppressed": return suppressedCount;
      case "owner": return products.filter(p => (p.audience || "owner") === "owner").length;
      case "tenant": return products.filter(p => p.audience === "tenant").length;
      default: return 0;
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "audience",
      header: "Audience",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "tenant" ? "cyan" : "blue"}>
          {(v || "owner").toUpperCase()}
        </Badge>;
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "owner", label: "Owner" },
          { value: "tenant", label: "Tenant" },
        ],
      },
    },
    {
      accessorKey: "description",
      header: "Public Product Description",
      cell: ({ getValue }) => {
        const val = getValue() || "";
        const charCount = val.length;
        return (
          <div style={{ fontSize: "13px", color: COLORS.textMuted, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.4 }}>
            {val ? val.replace(/\\n/g, "\n") : "\u2014"}
            {val && <span style={{ display: "block", fontSize: "11px", color: COLORS.textDim, marginTop: 2 }}>{charCount}/200</span>}
          </div>
        );
      },
      meta: { editable: true },
      size: 320,
    },
    {
      id: "footnote",
      accessorFn: (row) => row.metadata?.footnote || "",
      header: "*Footnote",
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <span style={{ fontSize: "12px", fontStyle: "italic", color: COLORS.textDim }}>
            {val ? `*${val}` : "\u2014"}
          </span>
        );
      },
      meta: { editable: true },
      size: 220,
    },
    {
      accessorKey: "app_path",
      header: "App Path",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", fontFamily: "monospace", color: COLORS.textMuted }}>
          {getValue() || "\u2014"}
        </span>
      ),
      meta: { editable: true },
      size: 140,
    },
    {
      accessorKey: "price_cents",
      header: "Price",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
          ${(getValue() / 100).toFixed(2)}
        </span>
      ),
      meta: { editable: true },
      size: 100,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "one_time" ? "blue" : "purple"}>
          {v === "one_time" ? "One-Time" : "Recurring"}
        </Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "one_time", label: "One-Time" },
          { value: "recurring", label: "Recurring" },
        ],
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (active) {
                // Suppressing — confirm first
                handleBulkSuppress([row.original.id]);
              } else {
                // Unsuppressing — immediate
                handleBulkUnsuppress([row.original.id]);
              }
            }}
            style={{
              display: "inline-block", padding: "3px 12px", borderRadius: 12,
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
              background: active ? "#052e16" : "#451a03",
              color: active ? COLORS.green : COLORS.amber,
              border: `1px solid ${active ? COLORS.green + "44" : COLORS.amber + "44"}`,
              userSelect: "none",
            }}
          >
            {active ? "ACTIVE" : "SUPPRESSED"}
          </span>
        );
      },
      size: 110,
      enableSorting: false,
    },
    {
      accessorKey: "is_implemented",
      header: "Wired to App",
      cell: ({ row }) => {
        const val = row.original.is_implemented;
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(row.original.id, "is_implemented", val);
            }}
            style={{
              display: "inline-block", padding: "3px 12px", borderRadius: 12,
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
              background: val ? "#052e16" : "#450a0a",
              color: val ? COLORS.green : COLORS.red,
              border: `1px solid ${val ? COLORS.green + "44" : COLORS.red + "44"}`,
              userSelect: "none",
            }}
          >
            {val ? "LIVE" : "NOT WIRED"}
          </span>
        );
      },
      size: 110,
      enableSorting: false,
    },
    {
      accessorKey: "sort_order",
      header: "Order",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>{getValue()}</span>
      ),
      meta: { editable: true },
      size: 70,
    },
    {
      accessorKey: "updated_at",
      header: "Last Modified",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDateFull(getValue())}</span>
      ),
      size: 180,
    },
  ], [handleToggle, handleBulkSuppress, handleBulkUnsuppress]);

  // Expanded row with suppress/unsuppress + detail grid
  const renderExpandedRow = useCallback((row) => {
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Product Name", row.name],
            ["Audience", (row.audience || "owner").toUpperCase()],
            ["Price", `$${(row.price_cents / 100).toFixed(2)}`],
            ["Type", row.type === "one_time" ? "One-Time" : "Recurring"],
            ["Interval", row.recurring_interval || "\u2014"],
            ["App Path", row.app_path || "\u2014"],
            ["Sort Order", row.sort_order],
            ["Stripe Price ID", row.stripe_price_id || "\u2014"],
            ["Status", row.is_active ? "Active" : "Suppressed"],
            ["Wired", row.is_implemented ? "Live" : "Not Wired"],
          ].map(([label, val]) => (
            <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600, marginTop: 2, wordBreak: "break-all" }}>{val}</div>
            </div>
          ))}
        </div>
        {row.description && (
          <div style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
            <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: "13px", color: COLORS.textMuted, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
              {row.description.replace(/\\n/g, "\n")}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {row.is_active ? (
            <button
              onClick={() => handleBulkSuppress([row.id])}
              style={{ ...baseButton, background: "#451a03", color: COLORS.amber, fontSize: "12px", border: `1px solid ${COLORS.amber}44` }}
            >
              Suppress
            </button>
          ) : (
            <button
              onClick={() => handleBulkUnsuppress([row.id])}
              style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "12px" }}
            >
              Unsuppress
            </button>
          )}
        </div>
        <AuditHistory tableName="products" rowId={row.id} />
      </div>
    );
  }, [handleBulkSuppress, handleBulkUnsuppress]);

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Products" value={totalCount} sub="In catalog" accent={COLORS.brand} />
        <StatCard label="Active" value={activeCount} sub="Visible in app" accent={COLORS.green} />
        <StatCard label="Suppressed" value={suppressedCount} sub="Hidden from app" accent={COLORS.amber} />
        <StatCard label="Implemented" value={implementedCount} sub="Wired into app" accent={COLORS.purple} />
        <StatCard label="Avg Price" value={`$${avgPrice}`} sub="Across all products" accent={COLORS.brand} />
      </div>

      {/* Info Banner */}
      <div style={{
        background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
        padding: "12px 16px", marginBottom: 20, fontSize: "13px", color: COLORS.textMuted, lineHeight: 1.5,
      }}>
        <strong style={{ color: COLORS.text }}>Suppress</strong> hides a product from all app displays without deleting it.
        Suppressed products stay in the catalog and can be redeployed at any time.
        Descriptions and pricing flow directly to the PadMagnet App &mdash; keep them public-friendly and punchy (200-char max).
        Use <code style={{ background: "#0f172a", padding: "1px 5px", borderRadius: 4, fontSize: "12px", color: COLORS.brand }}>{"\\n"}</code> for line breaks.
      </div>

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, description, path\u2026"
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
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>{statusCountFor(s)}</span>
          </button>
        ))}
      </div>

      {/* Add Button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: showAddForm ? COLORS.surface : COLORS.brand,
            color: showAddForm ? COLORS.text : "#000",
            fontWeight: 600, fontSize: "13px",
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Product"}
        </button>
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>
          Click status pill to suppress/unsuppress. Double-click name, description, price, path, or order to edit inline.
        </span>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{ marginBottom: 20 }}>
          <AddEntryForm
            fields={addFormFields}
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Create Product"
            savingLabel="Creating\u2026"
          />
        </div>
      )}

      {/* Unified Products Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        tableName="products"
        storageKey="products"
        onSave={handleSave}
        onBulkSuppress={handleBulkSuppress}
        onBulkUnsuppress={handleBulkUnsuppress}
        onBulkDelete={handleBulkDelete}
        onBulkHardDelete={handleBulkHardDelete}
        emptyMessage="No products match your filters"
        renderExpandedRow={renderExpandedRow}
      />

      {/* Suppress / Delete Confirmation */}
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={confirmExecute}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Hard Delete Confirmation — requires typing product name */}
      {hardDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setHardDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px", color: COLORS.red }}>
              Permanently remove {hardDeleteConfirm.ids.length} product{hardDeleteConfirm.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              This will permanently delete: <strong>{hardDeleteConfirm.names.join(", ")}</strong>
            </p>
            <p style={{ fontSize: "12px", color: COLORS.red, marginBottom: 12 }}>
              This action cannot be undone. The product will be removed from the database.
            </p>
            <p style={{ fontSize: "13px", color: COLORS.textMuted, marginBottom: 6 }}>
              Type <strong>{hardDeleteConfirm.names[0]}</strong> to confirm:
            </p>
            <input
              type="text"
              value={hardDeleteConfirm.typedName}
              onChange={e => setHardDeleteConfirm(prev => ({ ...prev, typedName: e.target.value }))}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                color: COLORS.text, fontSize: "14px", marginBottom: 16,
                boxSizing: "border-box",
              }}
              autoFocus
              placeholder={hardDeleteConfirm.names[0]}
            />
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setHardDeleteConfirm(null)}>Cancel</button>
              <button
                className="confirm-btn confirm"
                disabled={hardDeleteConfirm.typedName !== hardDeleteConfirm.names[0]}
                onClick={executeHardDelete}
                style={{
                  opacity: hardDeleteConfirm.typedName !== hardDeleteConfirm.names[0] ? 0.4 : 1,
                  background: "#7f1d1d",
                }}
              >
                Permanently Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
