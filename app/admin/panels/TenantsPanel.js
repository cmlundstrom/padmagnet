'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, Badge, StatCard, baseButton, timeAgo, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';
import AuditHistory from '../components/AuditHistory';
import AskPadHistory from '../components/AskPadHistory';

const TIER_COLORS = { free: 'gray', explorer: 'blue', master: 'purple' };
const TIER_LIMITS = { free: 10, explorer: 30, master: '∞' };
const LEVEL_NAMES = ['', 'Starter', 'Pad Explorer', 'Pad Hunter', 'Pad Expert', 'Pad Master'];

export default function TenantsPanel() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmUnarchive, setConfirmUnarchive] = useState(null);
  const [confirmPermanent, setConfirmPermanent] = useState(null);
  const [permanentConfirmText, setPermanentConfirmText] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { type, user }
  const [actionValue, setActionValue] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [renterPayments, setRenterPayments] = useState([]); // for refund modal

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

  const nameFor = useCallback((ids) => ids
    .map(id => {
      const t = tenants.find(t => t.id === id);
      return t ? `${t.display_name || t.email}` : id;
    })
    .join(", "), [tenants]);

  const handleBulkArchive = useCallback((ids) => {
    setConfirmArchive({ ids, names: nameFor(ids) });
  }, [nameFor]);

  const handleBulkUnarchive = useCallback((ids) => {
    setConfirmUnarchive({ ids, names: nameFor(ids) });
  }, [nameFor]);

  const handleBulkPermanentDelete = useCallback((ids) => {
    setConfirmPermanent({ ids, names: nameFor(ids) });
    setPermanentConfirmText("");
  }, [nameFor]);

  const executeArchive = useCallback(async () => {
    if (!confirmArchive) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", ids: confirmArchive.ids }),
    });
    if (!res.ok) {
      const result = await res.json();
      alert(`Archive failed: ${result.error}`);
    }
    setConfirmArchive(null);
    fetchTenants();
  }, [confirmArchive, fetchTenants]);

  const executeUnarchive = useCallback(async () => {
    if (!confirmUnarchive) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unarchive", ids: confirmUnarchive.ids }),
    });
    if (!res.ok) {
      const result = await res.json();
      alert(`Unarchive failed: ${result.error}`);
    }
    setConfirmUnarchive(null);
    fetchTenants();
  }, [confirmUnarchive, fetchTenants]);

  const executePermanentDelete = useCallback(async () => {
    if (!confirmPermanent || permanentConfirmText !== "DELETE") return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: confirmPermanent.ids }),
    });
    if (!res.ok) {
      const result = await res.json();
      alert(`Permanent delete failed: ${result.error}`);
    }
    setConfirmPermanent(null);
    setPermanentConfirmText("");
    fetchTenants();
  }, [confirmPermanent, permanentConfirmText, fetchTenants]);

  // ── Renter Actions ────────────────────────────────────
  const executeAction = useCallback(async (actionBody) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/renter-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionModal(null);
      setActionValue('');
      setActionReason('');
      setRenterPayments([]);
      fetchTenants();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
    setActionLoading(false);
  }, [fetchTenants]);

  const openRefundModal = useCallback(async (user) => {
    setActionModal({ type: 'refund_renter', user });
    // Fetch this renter's payments
    try {
      const res = await fetch(`/api/admin/renter-payments?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setRenterPayments(data);
      }
    } catch { setRenterPayments([]); }
  }, []);

  // ── Auth status helper ────────────────────────────────
  const getAuthStatus = (authStatus) => {
    if (!authStatus) return { label: "Active", color: COLORS.green, bg: "#052e16" };
    if (authStatus.last_sign_in_at) return { label: "Active", color: "#4ade80", bg: "#052e16" };
    if (authStatus.email_confirmed_at) return { label: "Confirmed", color: COLORS.brand, bg: "#042f2e" };
    return { label: "Unconfirmed", color: COLORS.textDim, bg: "#1e293b" };
  };

  // ── Table Columns ─────────────────────────────────────
  const columns = useMemo(() => [
    {
      accessorKey: "display_name",
      header: "Name",
      cell: ({ getValue, row }) => (
        <span style={{ fontWeight: 600 }}>
          {getValue() || "\u2014"}
          {row.original.is_anonymous && (
            <span style={{
              display: "inline-block", marginLeft: 6, padding: "1px 5px", borderRadius: 4,
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.03em",
              background: COLORS.amber + "22", color: COLORS.amber, border: `1px solid ${COLORS.amber}44`,
            }}>
              ANON
            </span>
          )}
        </span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 500, fontSize: "13px" }}>{getValue()}</span>
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
      size: 130,
    },
    {
      accessorKey: "renter_tier",
      header: "Tier",
      cell: ({ getValue }) => {
        const tier = getValue() || "free";
        return <Badge color={TIER_COLORS[tier] || "gray"}>{tier.toUpperCase()}</Badge>;
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
              }}>{r === "tenant" ? "renter" : r}</span>
            ))}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: "signup_role",
      header: "Origin",
      cell: ({ getValue }) => {
        const origin = getValue();
        if (!origin) return <span style={{ fontSize: "11px", color: COLORS.textDim }}>—</span>;
        const color = origin === 'owner' ? '#3B82F6'
          : (origin === 'admin' || origin === 'super_admin') ? '#7C3AED'
          : '#22C55E';
        const label = origin === 'tenant' ? 'RENTER' : origin === 'super_admin' ? 'SUPER' : origin.toUpperCase();
        return (
          <span style={{
            display: "inline-block", padding: "2px 7px", borderRadius: 4,
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.03em",
            background: color + "22", color, border: `1px solid ${color}44`,
          }}>{label}</span>
        );
      },
      size: 80,
    },
    {
      accessorKey: "padpoints",
      header: "Points",
      cell: ({ getValue }) => {
        const pts = getValue() || 0;
        const nearRedeem = pts >= 300;
        return (
          <span style={{ fontSize: "13px", fontWeight: 600, color: nearRedeem ? COLORS.amber : COLORS.text }}>
            {pts}
          </span>
        );
      },
      size: 70,
    },
    {
      accessorKey: "padlevel",
      header: "Lvl",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textMuted }}>{getValue() || 1}</span>
      ),
      size: 50,
    },
    {
      accessorKey: "streak_days",
      header: "Streak",
      cell: ({ getValue }) => {
        const days = getValue() || 0;
        if (days === 0) return <span style={{ fontSize: "12px", color: COLORS.textDim }}>—</span>;
        return (
          <span style={{ fontSize: "12px" }}>
            {days > 7 ? '🔥 ' : ''}{days}d
          </span>
        );
      },
      size: 70,
    },
    {
      id: "queries",
      header: "Queries",
      accessorFn: (row) => row.agent_queries_today || 0,
      cell: ({ row }) => {
        const used = row.original.agent_queries_today || 0;
        const tier = row.original.renter_tier || 'free';
        const limit = TIER_LIMITS[tier];
        return (
          <span style={{ fontSize: "12px", color: COLORS.textMuted }}>
            {used}/{limit}
          </span>
        );
      },
      size: 70,
    },
    {
      accessorKey: "agent_abuse_score",
      header: "Abuse",
      cell: ({ getValue }) => {
        const score = getValue() || 0;
        if (score === 0) return <span style={{ fontSize: "12px", color: COLORS.textDim }}>—</span>;
        const color = score > 50 ? COLORS.red : score > 25 ? COLORS.amber : COLORS.green;
        return <span style={{ fontSize: "12px", fontWeight: 700, color }}>{score}</span>;
      },
      size: 60,
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
      size: 90,
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 140,
    },
  ], []);

  // ── Expanded Row ──────────────────────────────────────
  const renderExpandedRow = useCallback((row) => {
    const tier = row.renter_tier || 'free';
    const cooldownActive = row.agent_cooldown_until && new Date(row.agent_cooldown_until) > new Date();
    const stripeUrl = row.stripe_customer_id
      ? `https://dashboard.stripe.com/customers/${row.stripe_customer_id}`
      : null;

    return (
      <div>
        {/* Detail Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8, marginBottom: 16 }}>
          {[
            ["Phone", row.phone || "Not set"],
            ["SMS Consent", row.sms_consent ? "✅ Yes" : "No"],
            ["Renter Tier", tier.toUpperCase()],
            ["PadPoints", row.padpoints || 0],
            ["PadLevel", LEVEL_NAMES[row.padlevel] || `Level ${row.padlevel || 1}`],
            ["Streak", `${row.streak_days || 0} days`],
            ["Streak Last", row.streak_last_date || "—"],
            ["Queries Today", `${row.agent_queries_today || 0} / ${TIER_LIMITS[tier]}`],
            ["Rollover", row.agent_queries_rollover || 0],
            ["Query Reset", row.agent_queries_reset_date || "—"],
            ["Abuse Score", row.agent_abuse_score || 0],
            ["Cooldown", cooldownActive ? formatDate(row.agent_cooldown_until) : "None"],
            ["Zones", `${row.search_zones_count || 1} / ${tier === 'master' ? 3 : tier === 'explorer' ? 2 : 1}`],
            ["Verified", row.verified_renter ? "✅ Yes" : "No"],
            ["Anonymous", row.is_anonymous ? "Yes" : "No"],
          ].map(([label, val]) => (
            <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "6px 10px" }}>
              <div style={{ fontSize: "9px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
              <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600, marginTop: 1 }}>{String(val)}</div>
            </div>
          ))}
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            style={{ ...baseButton, background: COLORS.amber + "22", color: COLORS.amber, border: `1px solid ${COLORS.amber}44`, fontSize: "12px" }}
            onClick={() => { setActionModal({ type: 'gift_points', user: row }); setActionValue('50'); }}
          >
            🎁 Gift Points
          </button>
          <button
            style={{ ...baseButton, background: COLORS.brand + "22", color: COLORS.brand, border: `1px solid ${COLORS.brand}44`, fontSize: "12px" }}
            onClick={() => { setActionModal({ type: 'gift_queries', user: row }); setActionValue('10'); }}
          >
            🔍 Gift Queries
          </button>
          <button
            style={{ ...baseButton, background: COLORS.purple + "22", color: COLORS.purple, border: `1px solid ${COLORS.purple}44`, fontSize: "12px" }}
            onClick={() => { setActionModal({ type: 'upgrade_tier', user: row }); setActionValue('explorer'); }}
          >
            ⬆️ Upgrade Tier
          </button>
          {tier !== 'free' && (
            <button
              style={{ ...baseButton, background: COLORS.red + "22", color: COLORS.red, border: `1px solid ${COLORS.red}44`, fontSize: "12px" }}
              onClick={() => setActionModal({ type: 'downgrade_tier', user: row })}
            >
              ⬇️ Downgrade
            </button>
          )}
          {(cooldownActive || (row.agent_abuse_score || 0) > 0) && (
            <button
              style={{ ...baseButton, background: COLORS.green + "22", color: COLORS.green, border: `1px solid ${COLORS.green}44`, fontSize: "12px" }}
              onClick={() => setActionModal({ type: 'clear_cooldown', user: row })}
            >
              🔓 Clear Cooldown
            </button>
          )}
          {tier !== 'free' && (
            <button
              style={{ ...baseButton, background: COLORS.red + "22", color: COLORS.red, border: `1px solid ${COLORS.red}44`, fontSize: "12px" }}
              onClick={() => openRefundModal(row)}
            >
              💳 Refund
            </button>
          )}
          {stripeUrl && (
            <a href={stripeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button style={{ ...baseButton, background: "#635bff22", color: "#635bff", border: "1px solid #635bff44", fontSize: "12px" }}>
                Stripe →
              </button>
            </a>
          )}
        </div>

        <AskPadHistory userId={row.id} userName={row.display_name || row.email} />

        <AuditHistory tableName="profiles" rowId={row.id} />
      </div>
    );
  }, [openRefundModal]);

  // ── Stat calculations ─────────────────────────────────
  const visibleTenants = useMemo(
    () => showArchived ? tenants.filter(t => t.archived_at) : tenants.filter(t => !t.archived_at),
    [tenants, showArchived]
  );
  const archivedCount = tenants.filter(t => t.archived_at).length;
  const paidCount = tenants.filter(t => t.renter_tier && t.renter_tier !== 'free').length;
  const avgPoints = tenants.length > 0 ? Math.round(tenants.reduce((s, t) => s + (t.padpoints || 0), 0) / tenants.length) : 0;
  const activeStreaks = tenants.filter(t => (t.streak_days || 0) > 0).length;
  const inCooldown = tenants.filter(t => t.agent_cooldown_until && new Date(t.agent_cooldown_until) > new Date()).length;
  const verifiedCount = tenants.filter(t => t.verified_renter).length;

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Renters" value={tenants.length} sub="Registered accounts" accent={COLORS.brand} />
        <StatCard label="Paid Tiers" value={paidCount} sub="Explorer + Master" accent={COLORS.purple} />
        <StatCard label="Avg Points" value={avgPoints} sub="Across all renters" accent={COLORS.amber} />
        <StatCard label="Active Streaks" value={activeStreaks} sub="Currently grinding" accent={COLORS.green} />
        <StatCard label="In Cooldown" value={inCooldown} sub="Rate-limited" accent={COLORS.red} />
        <StatCard label="Verified" value={verifiedCount} sub="Master tier" accent={COLORS.green} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>
          Click a row to expand game details and quick actions. Double-click name or email to edit inline.
        </span>
        <button
          onClick={() => setShowArchived(v => !v)}
          style={{
            ...baseButton,
            background: showArchived ? COLORS.amber + "22" : COLORS.surface,
            color: showArchived ? COLORS.amber : COLORS.textMuted,
            border: `1px solid ${showArchived ? COLORS.amber + "55" : COLORS.border}`,
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {showArchived ? `← Active (${tenants.length - archivedCount})` : `Archived (${archivedCount}) →`}
        </button>
      </div>

      {/* Tenants Table */}
      <AdminTable
        columns={columns}
        data={visibleTenants}
        loading={loading}
        error={error}
        tableName="profiles"
        storageKey="tenants"
        onSave={handleSave}
        onBulkDelete={showArchived ? handleBulkUnarchive : handleBulkArchive}
        onBulkDeleteLabel={showArchived ? "Unarchive" : "Archive"}
        onBulkHardDelete={handleBulkPermanentDelete}
        onBulkHardDeleteLabel="Permanent Delete"
        emptyMessage={showArchived ? "No archived renters" : "No renter accounts yet"}
        renderExpandedRow={renderExpandedRow}
      />

      {/* ── Action Modal ────────────────────────────────── */}
      {actionModal && (
        <div className="confirm-overlay" onClick={() => { setActionModal(null); setActionValue(''); setActionReason(''); setRenterPayments([]); }}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <p style={{ fontWeight: 700, fontSize: "15px", marginBottom: 4 }}>
              {actionModal.type === 'gift_points' && `🎁 Gift PadPoints to ${actionModal.user.display_name || actionModal.user.email}`}
              {actionModal.type === 'gift_queries' && `🔍 Gift AskPad Queries to ${actionModal.user.display_name || actionModal.user.email}`}
              {actionModal.type === 'upgrade_tier' && `⬆️ Upgrade Tier for ${actionModal.user.display_name || actionModal.user.email}`}
              {actionModal.type === 'downgrade_tier' && `⬇️ Downgrade ${actionModal.user.display_name || actionModal.user.email} to Free?`}
              {actionModal.type === 'clear_cooldown' && `🔓 Clear Cooldown for ${actionModal.user.display_name || actionModal.user.email}?`}
              {actionModal.type === 'refund_renter' && `💳 Refund ${actionModal.user.display_name || actionModal.user.email}`}
            </p>

            {/* Amount input for gift actions */}
            {['gift_points', 'gift_queries'].includes(actionModal.type) && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: "12px", color: COLORS.textMuted, display: "block", marginBottom: 4 }}>
                  {actionModal.type === 'gift_points' ? 'Points to award' : 'Queries to award'}
                </label>
                <input
                  type="number"
                  value={actionValue}
                  onChange={e => setActionValue(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`, borderRadius: 6,
                    color: COLORS.text, fontSize: "14px",
                  }}
                />
              </div>
            )}

            {/* Tier selector for upgrade */}
            {actionModal.type === 'upgrade_tier' && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: "12px", color: COLORS.textMuted, display: "block", marginBottom: 4 }}>Tier</label>
                <select
                  value={actionValue}
                  onChange={e => setActionValue(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`, borderRadius: 6,
                    color: COLORS.text, fontSize: "14px",
                  }}
                >
                  <option value="explorer">Explorer ($1.50/mo value)</option>
                  <option value="master">Master ($3.50/mo value)</option>
                </select>
              </div>
            )}

            {/* Payment selector for refund */}
            {actionModal.type === 'refund_renter' && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: "12px", color: COLORS.textMuted, display: "block", marginBottom: 4 }}>Payment to refund</label>
                {renterPayments.length === 0 ? (
                  <p style={{ fontSize: "12px", color: COLORS.textDim }}>No refundable payments found. The renter may have upgraded via PadPoints redemption (free).</p>
                ) : (
                  <select
                    value={actionValue}
                    onChange={e => setActionValue(e.target.value)}
                    style={{
                      width: "100%", padding: "8px 12px", background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`, borderRadius: 6,
                      color: COLORS.text, fontSize: "14px",
                    }}
                  >
                    <option value="">Select a payment...</option>
                    {renterPayments.map(p => (
                      <option key={p.id} value={p.id}>
                        ${(p.amount_cents / 100).toFixed(2)} — {new Date(p.created_at).toLocaleDateString()} — {p.status}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Reason (always) */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: "12px", color: COLORS.textMuted, display: "block", marginBottom: 4 }}>Reason (logged to audit trail)</label>
              <textarea
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="Brief reason for this action..."
                rows={2}
                style={{
                  width: "100%", padding: "8px 12px", background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`, borderRadius: 6,
                  color: COLORS.text, fontSize: "13px", resize: "vertical",
                }}
              />
            </div>

            <div className="confirm-actions" style={{ marginTop: 16 }}>
              <button
                className="confirm-btn cancel"
                onClick={() => { setActionModal(null); setActionValue(''); setActionReason(''); setRenterPayments([]); }}
              >
                Cancel
              </button>
              <button
                className="confirm-btn confirm"
                disabled={actionLoading || (actionModal.type === 'refund_renter' && !actionValue)}
                style={{
                  background: actionModal.type.includes('refund') || actionModal.type.includes('downgrade')
                    ? COLORS.red : COLORS.brand,
                  opacity: actionLoading ? 0.6 : 1,
                }}
                onClick={() => {
                  const base = {
                    action: actionModal.type,
                    user_id: actionModal.user.id,
                    reason: actionReason,
                  };

                  if (actionModal.type === 'gift_points' || actionModal.type === 'gift_queries') {
                    base.amount = parseInt(actionValue, 10);
                  } else if (actionModal.type === 'upgrade_tier') {
                    base.tier = actionValue;
                  } else if (actionModal.type === 'refund_renter') {
                    base.payment_id = actionValue;
                  }

                  executeAction(base);
                }}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      {confirmArchive && (
        <div className="confirm-overlay" onClick={() => setConfirmArchive(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Archive {confirmArchive.ids.length} renter{confirmArchive.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>{confirmArchive.names}</p>
            <div style={{
              padding: "10px 14px", marginTop: 12, marginBottom: 16, borderRadius: 8,
              background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)",
              fontSize: "12px", color: "#fbbf24", lineHeight: 1.5,
            }}>
              Hides from the default Renters list. Swipes, saved listings, PadPoints, and conversations
              are preserved. Reversible via the Archived tab. No auth data is touched.
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setConfirmArchive(null)}>Cancel</button>
              <button className="confirm-btn confirm" style={{ background: COLORS.amber }} onClick={executeArchive}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Unarchive Confirmation */}
      {confirmUnarchive && (
        <div className="confirm-overlay" onClick={() => setConfirmUnarchive(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Unarchive {confirmUnarchive.ids.length} renter{confirmUnarchive.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>{confirmUnarchive.names}</p>
            <div style={{
              padding: "10px 14px", marginTop: 12, marginBottom: 16, borderRadius: 8,
              background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)",
              fontSize: "12px", color: "#60a5fa", lineHeight: 1.5,
            }}>
              The account returns to the active list. Their data was never touched.
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setConfirmUnarchive(null)}>Cancel</button>
              <button className="confirm-btn confirm" style={{ background: COLORS.brand }} onClick={executeUnarchive}>Unarchive</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation — type DELETE to confirm */}
      {confirmPermanent && (
        <div className="confirm-overlay" onClick={() => { setConfirmPermanent(null); setPermanentConfirmText(""); }}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px", color: "#f87171" }}>
              ⚠️ Permanently delete {confirmPermanent.ids.length} renter{confirmPermanent.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>{confirmPermanent.names}</p>
            <div style={{
              padding: "10px 14px", marginTop: 12, marginBottom: 12, borderRadius: 8,
              background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)",
              fontSize: "12px", color: "#f87171", lineHeight: 1.5,
            }}>
              DANGER: Removes the renter account, their Supabase auth, all swipes, saved listings,
              PadPoints, conversations, and messages. **This cannot be undone.** Archive is almost
              always what you want instead.
            </div>
            <button
              onClick={() => {
                setConfirmArchive({ ids: confirmPermanent.ids, names: confirmPermanent.names });
                setConfirmPermanent(null);
                setPermanentConfirmText("");
              }}
              style={{
                ...baseButton, width: "100%", marginBottom: 12, background: COLORS.amber + "22",
                color: COLORS.amber, border: `1px solid ${COLORS.amber}55`, fontSize: "13px", fontWeight: 600,
              }}
            >
              ← Archive instead
            </button>
            <label style={{ fontSize: "12px", color: COLORS.textMuted, display: "block", marginBottom: 6 }}>
              Type <span style={{ color: "#f87171", fontWeight: 700 }}>DELETE</span> to confirm permanent removal:
            </label>
            <input
              type="text"
              value={permanentConfirmText}
              onChange={e => setPermanentConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              style={{
                width: "100%", padding: "10px 12px", marginBottom: 16, borderRadius: 6,
                background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text,
                fontSize: "14px", letterSpacing: "2px", fontFamily: "monospace",
              }}
            />
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => { setConfirmPermanent(null); setPermanentConfirmText(""); }}>Cancel</button>
              <button
                className="confirm-btn confirm"
                style={{ background: "#dc2626", opacity: permanentConfirmText === "DELETE" ? 1 : 0.4 }}
                disabled={permanentConfirmText !== "DELETE"}
                onClick={executePermanentDelete}
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
