'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, baseButton, Badge, StatCard, formatDateFull } from '../shared';
import AdminTable from '../components/AdminTable';
import AddEntryForm from '../components/AddEntryForm';

const SECTION_COLORS = {
  hero: 'purple',
  stats: 'blue',
  features: 'cyan',
  contact: 'green',
  agent: 'amber',
};

const RENDER_TYPE_COLORS = {
  text: 'blue',
  stat: 'purple',
  boolean: 'green',
  currency: 'amber',
  link: 'cyan',
  autolink: 'cyan',
  badge: 'red',
  date: 'blue',
  number: 'purple',
};

export default function DisplayFieldsPanel() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/display-fields");
      if (!res.ok) throw new Error("Failed to load display fields");
      const data = await res.json();
      setFields(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/display-fields", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchFields();
  }, [fetchFields]);

  const handleToggle = useCallback(async (id, field, currentValue) => {
    await fetch("/api/admin/display-fields", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], changes: { [field]: !currentValue } }),
    });
    fetchFields();
  }, [fetchFields]);

  const handleAdd = useCallback(async (values) => {
    const res = await fetch("/api/admin/display-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        output_key: values.output_key,
        label: values.label,
        section: values.section || 'features',
        canonical_column: values.canonical_column,
        render_type: values.render_type || 'text',
        sort_order: parseInt(values.sort_order, 10) || 0,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(`Create failed: ${result.error}`);
      return;
    }
    setShowAddForm(false);
    fetchFields();
  }, [fetchFields]);

  const handleBulkDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const f = fields.find(f => f.id === id);
      return f ? f.output_key : id;
    }).join(", ");
    setConfirmDelete({ ids, names });
  }, [fields]);

  const executeDelete = useCallback(async () => {
    if (!confirmDelete) return;
    for (const id of confirmDelete.ids) {
      await fetch("/api/admin/display-fields", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
    setConfirmDelete(null);
    fetchFields();
  }, [confirmDelete, fetchFields]);

  const addFormFields = useMemo(() => [
    { key: "output_key", label: "Output Key", type: "text", required: true, placeholder: "e.g. pool" },
    { key: "label", label: "Display Label", type: "text", required: true, placeholder: "e.g. Pool" },
    {
      key: "section", label: "Section", type: "select", required: true,
      options: [
        { value: "hero", label: "Hero" },
        { value: "stats", label: "Stats" },
        { value: "features", label: "Features" },
        { value: "contact", label: "Contact" },
        { value: "agent", label: "Agent" },
      ],
      defaultValue: "features",
    },
    { key: "canonical_column", label: "DB Column", type: "text", required: true, placeholder: "e.g. pool" },
    {
      key: "render_type", label: "Render Type", type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "stat", label: "Stat" },
        { value: "boolean", label: "Boolean" },
        { value: "currency", label: "Currency" },
        { value: "number", label: "Number" },
        { value: "date", label: "Date" },
        { value: "link", label: "Link" },
        { value: "autolink", label: "Autolink" },
        { value: "badge", label: "Badge" },
      ],
      defaultValue: "text",
    },
    { key: "sort_order", label: "Sort Order", type: "text", placeholder: "0" },
  ], []);

  const tenantVisibleCount = fields.filter(f => f.visible).length;
  const ownerVisibleCount = fields.filter(f => f.visible_owner).length;

  const columns = useMemo(() => [
    {
      accessorKey: "output_key",
      header: "Output Key",
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{getValue()}</span>
      ),
      meta: { editable: true },
      size: 160,
    },
    {
      accessorKey: "label",
      header: "Label",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600 }}>{getValue()}</span>
      ),
      meta: { editable: true },
      size: 180,
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={SECTION_COLORS[v] || 'blue'}>{v.toUpperCase()}</Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "hero", label: "Hero" },
          { value: "stats", label: "Stats" },
          { value: "features", label: "Features" },
          { value: "contact", label: "Contact" },
          { value: "agent", label: "Agent" },
        ],
      },
    },
    {
      accessorKey: "canonical_column",
      header: "DB Column",
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px", color: COLORS.textMuted }}>{getValue()}</span>
      ),
      meta: { editable: true },
      size: 170,
    },
    {
      accessorKey: "render_type",
      header: "Render Type",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={RENDER_TYPE_COLORS[v] || 'blue'}>{v}</Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "text", label: "Text" },
          { value: "stat", label: "Stat" },
          { value: "boolean", label: "Boolean" },
          { value: "currency", label: "Currency" },
          { value: "number", label: "Number" },
          { value: "date", label: "Date" },
          { value: "link", label: "Link" },
          { value: "autolink", label: "Autolink" },
          { value: "badge", label: "Badge" },
        ],
      },
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
      accessorKey: "visible",
      header: "Tenant",
      cell: ({ row }) => {
        const val = row.original.visible;
        return (
          <span
            onClick={() => handleToggle(row.original.id, "visible", val)}
            style={{
              display: "inline-block", padding: "2px 10px", borderRadius: 12,
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
              background: val ? "#052e16" : "#1e293b",
              color: val ? COLORS.green : COLORS.textDim,
              border: `1px solid ${val ? COLORS.green + "44" : COLORS.border}`,
              userSelect: "none",
            }}
          >
            {val ? "ON" : "OFF"}
          </span>
        );
      },
      size: 80,
      enableSorting: false,
    },
    {
      accessorKey: "visible_owner",
      header: "Owner",
      cell: ({ row }) => {
        const val = row.original.visible_owner;
        return (
          <span
            onClick={() => handleToggle(row.original.id, "visible_owner", val)}
            style={{
              display: "inline-block", padding: "2px 10px", borderRadius: 12,
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
              background: val ? "#0c1f3d" : "#1e293b",
              color: val ? COLORS.brand : COLORS.textDim,
              border: `1px solid ${val ? COLORS.brand + "44" : COLORS.border}`,
              userSelect: "none",
            }}
          >
            {val ? "ON" : "OFF"}
          </span>
        );
      },
      size: 80,
      enableSorting: false,
    },
  ], [handleToggle]);

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Fields" value={fields.length} sub="Display field configs" accent={COLORS.brand} />
        <StatCard label="Renter Visible" value={tenantVisibleCount} sub="Shown to renters" accent={COLORS.green} />
        <StatCard label="Owner Visible" value={ownerVisibleCount} sub="Shown to owners" accent={COLORS.blue} />
      </div>

      {/* Info Banner */}
      <div style={{
        background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
        padding: "12px 16px", marginBottom: 20, fontSize: "13px", color: COLORS.textMuted, lineHeight: 1.5,
      }}>
        Controls which fields appear on the renter listing detail page. Toggle visibility, reorder with sort_order,
        or change labels. <code style={{ background: "#0f172a", padding: "1px 5px", borderRadius: 4, fontSize: "12px", color: COLORS.brand }}>format_options</code> are
        managed via SQL (seeded data covers all current needs).
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
          {showAddForm ? "Cancel" : "+ Add Field"}
        </button>
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>
          Click toggle to flip visibility. Double-click output key, label, section, column, type, or order to edit inline.
        </span>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{ marginBottom: 20 }}>
          <AddEntryForm
            fields={addFormFields}
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Create Field"
            savingLabel="Creating..."
          />
        </div>
      )}

      {/* Table */}
      <AdminTable
        columns={columns}
        data={fields}
        loading={loading}
        error={error}
        tableName="display_field_configs"
        storageKey="display-fields"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        emptyMessage="No display field configs found"
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Delete {confirmDelete.ids.length} field config{confirmDelete.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              {confirmDelete.names}
            </p>
            <p style={{ fontSize: "12px", color: COLORS.textDim, marginBottom: 16 }}>
              This removes the config row only. No listing data is affected.
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="confirm-btn confirm" onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
