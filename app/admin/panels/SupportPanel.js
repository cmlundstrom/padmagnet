'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createSupabaseBrowser } from '../../../lib/supabase-browser';
import { COLORS, baseButton, Badge, StatCard, timeAgo, formatDate } from '../shared';
import AdminTable from '../components/AdminTable';
import AddEntryForm from '../components/AddEntryForm';
import ConfirmDialog from '../components/ConfirmDialog';
import exportCSV from '../components/CSVExport';

export default function SupportPanel({ onTicketChange }) {
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyChannel, setReplyChannel] = useState("web");
  const [replySending, setReplySending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // Fetch admin user profile from profiles table
  useEffect(() => {
    const fetchAdmin = async () => {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const res = await fetch(`/api/admin/users?id=${user.id}`);
          if (res.ok) {
            const profile = await res.json();
            setAdminUser({
              email: profile.email || user.email,
              display_name: profile.display_name || user.email?.split("@")[0] || "Admin",
              phone: profile.phone || "",
            });
          } else {
            // Fallback to auth user if profile not found
            setAdminUser({
              email: user.email,
              display_name: user.email?.split("@")[0] || "Admin",
              phone: "",
            });
          }
        } catch {
          setAdminUser({
            email: user.email,
            display_name: user.email?.split("@")[0] || "Admin",
            phone: "",
          });
        }
      }
    };
    fetchAdmin();
  }, []);

  const channelIcons = { sms: "\uD83D\uDCF1", web: "\uD83C\uDF10", email: "\uD83D\uDCE7", phone: "\uD83D\uDCDE" };
  const priorityColors = { low: "gray", normal: "blue", high: "amber", urgent: "red" };
  const statusColors = { open: "green", in_progress: "cyan", resolved: "blue", closed: "gray" };
  const categoryColors = { general: "gray", listings: "blue", access: "cyan", billing: "purple", bug: "red", privacy: "amber", unsubscribe: "amber" };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets");
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = await res.json();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
    onTicketChange?.();
  }, [onTicketChange]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const fetchMessages = useCallback(async (ticketId) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/messages?ticket_id=${ticketId}`);
      if (res.ok) setMessages(await res.json());
    } catch {
      // silent
    }
    setMessagesLoading(false);
  }, []);

  // When a ticket is selected, load its messages
  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket);
      setReplyText("");
    } else {
      setMessages([]);
    }
  }, [selectedTicket, fetchMessages]);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tickets, statusFilter]);

  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;
  const smsCount = tickets.filter(t => t.channel === "sms").length;

  // CRUD handlers
  const handleAddTicket = useCallback(async (values) => {
    const res = await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setShowAddForm(false);
      setShowAdminForm(false);
      fetchTickets();
    }
  }, [fetchTickets]);

  // Admin quick-add: pre-fill contact from logged-in admin
  const handleAdminTicket = useCallback(async (values) => {
    const merged = {
      ...values,
      contact_name: adminUser?.display_name || "Admin",
      contact_email: adminUser?.email || "",
      contact_phone: adminUser?.phone || "",
    };
    // Default subject if empty
    if (!merged.subject?.trim()) {
      merged.subject = `Admin report \u2014 ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    await handleAddTicket(merged);
  }, [adminUser, handleAddTicket]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchTickets();
  }, [fetchTickets]);

  // Close tickets (set status to closed)
  const handleBulkClose = useCallback((ids) => {
    handleSave(ids, { status: "closed" });
  }, [handleSave]);

  const handleBulkDelete = useCallback((ids) => {
    setConfirmAction({
      type: "delete",
      ids,
      message: `You are about to delete ${ids.length} ticket${ids.length > 1 ? "s" : ""} permanently.`,
      showReason: false,
    });
  }, []);

  const handleBulkSuppress = useCallback((ids) => {
    setConfirmAction({
      type: "suppress",
      ids,
      message: `Suppress ${ids.length} ticket${ids.length > 1 ? "s" : ""}?`,
      showReason: true,
    });
  }, []);

  const handleBulkUnsuppress = useCallback((ids) => {
    handleSave(ids, { suppressed: false });
  }, [handleSave]);

  const confirmExecute = useCallback(async (action) => {
    if (!confirmAction) return;
    if (action === "close") {
      // Close instead of delete
      await handleSave(confirmAction.ids, { status: "closed" });
    } else if (action === "delete" || confirmAction.type === "delete") {
      await fetch("/api/admin/tickets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmAction.ids }),
      });
    } else if (confirmAction.type === "suppress") {
      await handleSave(confirmAction.ids, { suppressed: true });
    }
    setConfirmAction(null);
    fetchTickets();
  }, [confirmAction, handleSave, fetchTickets]);

  const handleReply = useCallback(async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setReplySending(true);
    const res = await fetch("/api/admin/tickets/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: selectedTicket,
        body: replyText.trim(),
        channel: replyChannel,
      }),
    });
    if (res.ok) {
      setReplyText("");
      fetchMessages(selectedTicket);
      fetchTickets(); // refresh updated_at
    }
    setReplySending(false);
  }, [selectedTicket, replyText, replyChannel, fetchMessages, fetchTickets]);

  const handleExportCSV = useCallback(() => {
    const cols = [
      { accessorKey: "subject", header: "Subject" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "priority", header: "Priority" },
      { accessorKey: "channel", header: "Channel" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "contact_name", header: "Contact Name" },
      { accessorKey: "contact_email", header: "Contact Email" },
      { accessorKey: "contact_phone", header: "Contact Phone" },
      { accessorKey: "assignee", header: "Assignee" },
      { accessorKey: "created_at", header: "Created" },
    ];
    exportCSV(cols, filtered, `padmagnet-tickets-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filtered]);

  // Column defs for AdminTable
  const columns = useMemo(() => [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue();
        const label = v === "in_progress" ? "In Progress" : v.charAt(0).toUpperCase() + v.slice(1);
        return <Badge color={statusColors[v] || "gray"}>{label}</Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In Progress" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
        ],
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={priorityColors[v] || "blue"}>{v}</Badge>;
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "low", label: "Low" },
          { value: "normal", label: "Normal" },
          { value: "high", label: "High" },
          { value: "urgent", label: "Urgent" },
        ],
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "contact_name",
      header: "Contact",
      cell: ({ getValue, row }) => {
        const name = getValue();
        const email = row.original.contact_email;
        const phone = row.original.contact_phone;
        return (
          <span>
            <span style={{ fontWeight: 500 }}>{name || "\u2014"}</span>
            {(email || phone) && (
              <span style={{ fontSize: "11px", color: COLORS.textDim, display: "block" }}>
                {email || phone}
              </span>
            )}
          </span>
        );
      },
      size: 160,
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>{channelIcons[v] || "\uD83C\uDF10"}</span>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: COLORS.textMuted }}>{v}</span>
          </span>
        );
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "web", label: "\uD83C\uDF10 Web" },
          { value: "sms", label: "\uD83D\uDCF1 SMS" },
          { value: "email", label: "\uD83D\uDCE7 Email" },
          { value: "phone", label: "\uD83D\uDCDE Phone" },
        ],
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={categoryColors[v] || "gray"}>{v}</Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "general", label: "General" },
          { value: "listings", label: "Listings" },
          { value: "access", label: "Access" },
          { value: "billing", label: "Billing" },
          { value: "bug", label: "Bug" },
          { value: "privacy", label: "Privacy" },
          { value: "unsubscribe", label: "Unsubscribe" },
        ],
      },
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: getValue() ? COLORS.text : COLORS.textDim }}>
          {getValue() || "Unassigned"}
        </span>
      ),
      size: 110,
      meta: { editable: true },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{timeAgo(getValue())}</span>
      ),
      size: 100,
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

  // Custom expanded row: ticket thread view
  const renderExpandedRow = useCallback((ticket) => {
    const isSelected = selectedTicket === ticket.id;
    if (!isSelected) {
      // Auto-select on first expansion
      setSelectedTicket(ticket.id);
    }
    const ticketMessages = isSelected ? messages : [];
    const isLoading = isSelected && messagesLoading;

    return (
      <div className="ticket-expanded">
        {/* Thread Header */}
        <div className="ticket-thread-header">
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: COLORS.text }}>{ticket.subject}</div>
            <div style={{ fontSize: "12px", color: COLORS.textDim, marginTop: 2 }}>
              {ticket.contact_name || "Unknown"} · {ticket.contact_email || ticket.contact_phone || "No contact"} · {(ticket.channel || "web").toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Badge color={statusColors[ticket.status] || "gray"}>
              {ticket.status === "in_progress" ? "In Progress" : ticket.status}
            </Badge>
            <Badge color={priorityColors[ticket.priority] || "blue"}>{ticket.priority}</Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="ticket-thread">
          {isLoading ? (
            <div style={{ padding: 20, textAlign: "center", color: COLORS.textDim }}>Loading messages\u2026</div>
          ) : ticketMessages.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: COLORS.textDim }}>No messages yet</div>
          ) : (
            ticketMessages.map(msg => (
              <div key={msg.id} className={`ticket-message ${msg.direction}`}>
                <div className="ticket-message-bubble">
                  <div style={{ fontSize: "13px", color: COLORS.text, lineHeight: 1.5 }}>{msg.body}</div>
                  <div className="ticket-message-meta">
                    <span>{msg.sender_name || (msg.direction === "outbound" ? "Agent" : "Customer")}</span>
                    <span>{(msg.channel || "web").toUpperCase()}</span>
                    <span>{formatDate(msg.created_at)}</span>
                    {msg.direction === "outbound" && (
                      <span style={{ color: msg.delivery_status === "delivered" ? COLORS.green : COLORS.amber }}>
                        {msg.delivery_status === "delivered" ? "\u2713\u2713" : "\u2713"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Box */}
        <div className="ticket-reply-box">
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={replyChannel}
              onChange={e => setReplyChannel(e.target.value)}
              style={{
                padding: "6px 8px", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                borderRadius: 6, color: COLORS.brand, fontSize: "12px", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <option value="web">{"\uD83C\uDF10"} Web</option>
              <option value="sms">{"\uD83D\uDCF1"} SMS</option>
              <option value="email">{"\uD83D\uDCE7"} Email</option>
            </select>
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply\u2026"
              onKeyDown={e => { if (e.key === "Enter" && replyText.trim() && !replySending) handleReply(); }}
              style={{
                flex: 1, padding: "8px 14px", background: COLORS.bg,
                border: `1px solid ${COLORS.border}`, borderRadius: "6px",
                color: COLORS.text, fontSize: "13px", outline: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              onClick={handleReply}
              disabled={replySending || !replyText.trim()}
              style={{
                ...baseButton,
                background: replySending || !replyText.trim() ? COLORS.border : COLORS.brand,
                color: replySending || !replyText.trim() ? COLORS.textDim : "#000",
                fontWeight: 700,
              }}
            >
              {replySending ? "Sending\u2026" : "Send"}
            </button>
          </div>
          {replyChannel === "sms" && replyText.length > 0 && (
            <div style={{ fontSize: "11px", color: replyText.length > 160 ? COLORS.amber : COLORS.textDim, marginTop: 4 }}>
              {replyText.length}/160 chars {replyText.length > 160 && `(${Math.ceil(replyText.length / 160)} SMS segments)`}
            </div>
          )}
        </div>
      </div>
    );
  }, [selectedTicket, messages, messagesLoading, replyText, replyChannel, replySending, handleReply]);

  const categoryOptions = [
    { value: "general", label: "General" },
    { value: "listings", label: "Listings" },
    { value: "access", label: "Access" },
    { value: "billing", label: "Billing" },
    { value: "bug", label: "Bug" },
    { value: "privacy", label: "Privacy" },
    { value: "unsubscribe", label: "Unsubscribe" },
  ];
  const channelOptions = [
    { value: "web", label: "Web" },
    { value: "sms", label: "SMS" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
  ];
  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  const addFormFields = [
    { key: "subject", label: "Subject", type: "text", placeholder: "Brief description of the issue", required: true },
    { key: "contact_name", label: "Contact Name", type: "text", placeholder: "Customer name" },
    { key: "contact_email", label: "Contact Email", type: "email", placeholder: "customer@example.com" },
    { key: "contact_phone", label: "Contact Phone", type: "text", placeholder: "+1 (555) 000-0000" },
    { key: "channel", label: "Channel", type: "select", options: channelOptions },
    { key: "category", label: "Category", type: "select", options: categoryOptions },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    { key: "body", label: "Initial Message", type: "textarea", placeholder: "Describe the issue\u2026" },
  ];

  // Admin quick-add form \u2014 fewer fields, contact auto-filled
  const adminFormFields = [
    { key: "subject", label: "Subject", type: "text", placeholder: "Quick bug note (optional \u2014 auto-generates if blank)" },
    { key: "category", label: "Category", type: "select", defaultValue: "bug", options: categoryOptions },
    { key: "priority", label: "Priority", type: "select", defaultValue: "normal", options: priorityOptions },
    { key: "channel", label: "Channel", type: "select", defaultValue: "web", options: channelOptions },
    { key: "body", label: "Details", type: "textarea", placeholder: "What did you find? (optional)" },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Open Tickets" value={openCount} sub={`${tickets.length} total`} accent={COLORS.green} />
        <StatCard label="In Progress" value={inProgressCount} sub="Being worked on" accent={COLORS.brand} />
        <StatCard label="Resolved" value={resolvedCount} sub="Completed" accent={COLORS.blue} />
        <StatCard label="SMS Tickets" value={smsCount} sub={`${tickets.length > 0 ? Math.round(smsCount / tickets.length * 100) : 0}% of total`} accent={COLORS.amber} />
      </div>

      {/* Filters & Actions Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "open", "in_progress", "resolved", "closed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            ...baseButton,
            background: statusFilter === s ? COLORS.brand + "22" : COLORS.surface,
            color: statusFilter === s ? COLORS.brand : COLORS.textMuted,
            border: `1px solid ${statusFilter === s ? COLORS.brand + "44" : COLORS.border}`,
          }}>
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>
              {s === "all" ? tickets.length : tickets.filter(t => t.status === s).length}
            </span>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => { setShowAdminForm(!showAdminForm); setShowAddForm(false); }} style={{
            ...baseButton, background: COLORS.amber + "22", color: COLORS.amber, border: `1px solid ${COLORS.amber}44`, fontWeight: 700,
          }}>
            + Admin Ticket
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setShowAdminForm(false); }} style={{
            ...baseButton, background: COLORS.brand, color: "#000", fontWeight: 700,
          }}>
            + New Ticket
          </button>
          <button onClick={handleExportCSV} style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Admin Quick-Add Form */}
      {showAdminForm && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            padding: "8px 14px", marginBottom: 0, borderRadius: "8px 8px 0 0",
            background: COLORS.amber + "12", border: `1px solid ${COLORS.amber}33`, borderBottom: "none",
            fontSize: "12px", color: COLORS.amber, fontWeight: 600,
          }}>
            Filing as: {adminUser?.display_name || "Admin"} ({adminUser?.email || "\u2014"})
          </div>
          <AddEntryForm
            fields={adminFormFields}
            onSave={handleAdminTicket}
            onCancel={() => setShowAdminForm(false)}
          />
        </div>
      )}

      {/* Add Entry Form (full) */}
      {showAddForm && (
        <AddEntryForm
          fields={addFormFields}
          onSave={handleAddTicket}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Admin Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        tableName="tickets"
        storageKey="support"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkClose={handleBulkClose}
        onBulkSuppress={handleBulkSuppress}
        onBulkUnsuppress={handleBulkUnsuppress}
        emptyMessage="No tickets yet \u2014 create one with the + New Ticket button above"
        renderExpandedRow={renderExpandedRow}
      />

      {/* Ticket Confirm Dialog \u2014 custom with Close + Delete options */}
      {confirmAction && confirmAction.type === "delete" && (
        <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message">{confirmAction.message}</p>
            <p style={{ fontSize: "13px", color: COLORS.textMuted, lineHeight: 1.6, margin: "0 0 16px" }}>
              Closing is recommended over deleting. Closed tickets remain in your history
              for tracking bugs and issues resolved over time. Deletion is permanent and
              cannot be undone.
            </p>
            <div className="confirm-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="confirm-btn cancel" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className="confirm-btn"
                style={{ background: COLORS.brand + "22", color: COLORS.brand, border: `1px solid ${COLORS.brand}44` }}
                onClick={() => confirmExecute("close")}
              >
                Close Ticket{confirmAction.ids.length > 1 ? "s" : ""}
              </button>
              <button className="confirm-btn confirm" onClick={() => confirmExecute("delete")}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppress Confirm Dialog \u2014 uses standard ConfirmDialog */}
      {confirmAction && confirmAction.type === "suppress" && (
        <ConfirmDialog
          message={confirmAction.message}
          showReason={confirmAction.showReason}
          onConfirm={(reason) => { handleSave(confirmAction.ids, { suppressed: true }); setConfirmAction(null); fetchTickets(); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
