'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, baseButton, Badge, StatCard, timeAgo, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';
import AddEntryForm from '../components/AddEntryForm';

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchUsers();
  }, [fetchUsers]);

  const handleInvite = useCallback(async (values) => {
    const res = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, display_name: values.display_name }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(`Invite failed: ${result.error}`);
      return;
    }
    setShowInviteForm(false);
    fetchUsers();
  }, [fetchUsers]);

  const handleBulkDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const u = users.find(u => u.id === id);
      return u ? `${u.display_name || u.email}` : id;
    }).join(", ");
    setConfirmDelete({ ids, names });
  }, [users]);

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
    fetchUsers();
  }, [confirmDelete, fetchUsers]);

  const inviteFormFields = useMemo(() => [
    { key: "display_name", label: "First Name", type: "text", required: true, placeholder: "e.g. Sarah" },
    { key: "email", label: "Email Address", type: "text", required: true, placeholder: "e.g. sarah@company.com" },
  ], []);

  const superAdminCount = users.filter(u => u.role === "super_admin").length;
  const adminCount = users.filter(u => u.role === "admin").length;

  // Auth status helper
  const getAuthStatus = (authStatus) => {
    if (!authStatus) return { label: "Active", color: COLORS.green, bg: "#052e16" };
    if (authStatus.last_sign_in_at) return { label: "Authenticated", color: "#4ade80", bg: "#052e16" };
    if (authStatus.invited_at) return { label: "Invited (Pending)", color: COLORS.amber, bg: "#1a1400" };
    return { label: "Active", color: COLORS.green, bg: "#052e16" };
  };

  const columns = useMemo(() => [
    {
      accessorKey: "display_name",
      header: "Display Name",
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
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "super_admin" ? "purple" : "cyan"}>
          {v === "super_admin" ? "Super Admin" : "Admin"}
        </Badge>;
      },
      size: 120,
      meta: {
        editable: true,
        editOptions: [
          { value: "admin", label: "Admin" },
          { value: "super_admin", label: "Super Admin" },
        ],
      },
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
      size: 140,
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: "Created",
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

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Admins" value={users.length} sub="Administrator accounts" accent={COLORS.brand} />
        <StatCard label="Super Admins" value={superAdminCount} sub="Full access" accent={COLORS.purple} />
        <StatCard label="Admins" value={adminCount} sub="Standard access" accent={COLORS.green} />
        <StatCard label="Last Added" value={users.length > 0 ? timeAgo(users[users.length - 1]?.created_at) : "\u2014"} sub={users[users.length - 1]?.display_name || "\u2014"} accent={COLORS.amber} />
      </div>

      {/* Invite Button + Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: showInviteForm ? COLORS.surface : COLORS.amber,
            color: showInviteForm ? COLORS.text : "#000",
            fontWeight: 600, fontSize: "13px",
          }}
        >
          {showInviteForm ? "Cancel" : "+ Invite Admin"}
        </button>
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>
          Double-click any cell to edit. Changes are saved immediately and logged to the audit trail.
        </span>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            padding: "10px 14px", marginBottom: 12, borderRadius: 8,
            background: "#1a1400", border: `1px solid ${COLORS.amber}33`,
            fontSize: "13px", color: COLORS.amber,
          }}>
            An invite email will be sent. The new user will be created as a regular Admin (not Super Admin).
          </div>
          <AddEntryForm
            fields={inviteFormFields}
            onSave={handleInvite}
            onCancel={() => setShowInviteForm(false)}
            submitLabel="Email Admin Invite Link"
            savingLabel="Sending invite\u2026"
          />
        </div>
      )}

      {/* Admin Table */}
      <AdminTable
        columns={columns}
        data={users}
        loading={loading}
        error={error}
        tableName="profiles"
        storageKey="users"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        emptyMessage="No user profiles yet"
      />

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Delete {confirmDelete.ids.length} user{confirmDelete.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              {confirmDelete.names}
            </p>
            <div style={{
              padding: "10px 14px", marginTop: 12, marginBottom: 16, borderRadius: 8,
              background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)",
              fontSize: "12px", color: "#f87171", lineHeight: 1.5,
            }}>
              DANGER: This permanently deletes the user profile AND their Supabase auth account.
              They will lose all access and cannot log in. This action cannot be undone.
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
