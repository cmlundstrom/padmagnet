'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, Badge, StatCard, timeAgo, formatDate, baseButton } from '../shared';
import AdminTable from '../components/AdminTable';

// ── Channel icon helper ──
const CHANNEL_ICON = { sms: '💬', email: '📧', push: '🔔', in_app: '📱' };
const STATUS_COLOR = { pending: 'amber', processing: 'amber', sent: 'green', failed: 'red', cancelled: 'gray' };

export default function MessagingPanel() {
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail view
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [convoDetail, setConvoDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirm dialog
  const [confirm, setConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/messaging?limit=500');
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      setStats({
        totalConversations: data.totalConversations,
        activeConversations: data.activeConversations,
        totalMessages: data.totalMessages,
        messagesToday: data.messagesToday,
        messagesThisWeek: data.messagesThisWeek,
        pendingDeliveryQueue: data.pendingDeliveryQueue,
        failedDeliveryQueue: data.failedDeliveryQueue,
      });
      setConversations(data.conversations || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Load conversation detail
  async function openConversation(convo) {
    setSelectedConvo(convo);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/messaging?conversation_id=${convo.id}`);
      if (res.ok) {
        setConvoDetail(await res.json());
      }
    } catch { /* silent */ }
    setDetailLoading(false);
  }

  function closeDetail() {
    setSelectedConvo(null);
    setConvoDetail(null);
  }

  // Actions
  async function updateStatus(id, newStatus) {
    try {
      const res = await fetch('/api/admin/messaging', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchData();
        if (selectedConvo?.id === id) {
          setSelectedConvo(prev => ({ ...prev, status: newStatus }));
          if (convoDetail) {
            setConvoDetail(prev => ({
              ...prev,
              conversation: { ...prev.conversation, status: newStatus },
            }));
          }
        }
      }
    } catch { /* silent */ }
    setConfirm(null);
  }

  async function deleteConversation(id) {
    try {
      const res = await fetch(`/api/admin/messaging?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        closeDetail();
        fetchData();
      }
    } catch { /* silent */ }
    setConfirm(null);
  }

  async function handleBulkDelete(ids) {
    if (!window.confirm(`Delete ${ids.length} conversation(s) and all their messages? This cannot be undone.`)) return;
    for (const id of ids) {
      await fetch(`/api/admin/messaging?id=${id}`, { method: 'DELETE' });
    }
    fetchData();
  }

  // ── AdminTable columns ──
  const columns = useMemo(() => [
    {
      accessorKey: 'listing_address',
      header: 'Address',
      cell: ({ row }) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.original.listing_address || 'Unknown'}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.original.last_message_text || '—'}
          </div>
        </div>
      ),
      size: 240,
    },
    {
      accessorKey: 'tenant_name',
      header: 'Tenant',
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px' }}>{getValue() || '—'}</span>
      ),
      size: 130,
    },
    {
      accessorKey: 'owner_name',
      header: 'Owner / Agent',
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px' }}>{getValue() || '—'}</span>
      ),
      size: 130,
    },
    {
      accessorKey: 'conversation_type',
      header: 'Type',
      cell: ({ getValue }) => (
        <Badge color={getValue() === 'external_agent' ? 'amber' : 'blue'}>
          {getValue() === 'external_agent' ? 'MLS Agent' : 'Internal'}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue();
        return (
          <Badge color={s === 'active' ? 'green' : s === 'blocked' ? 'red' : 'gray'}>
            {s}
          </Badge>
        );
      },
      size: 90,
    },
    {
      accessorKey: 'last_message_at',
      header: 'Last Activity',
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: COLORS.textDim }}>
          {getValue() ? timeAgo(getValue()) : '—'}
        </span>
      ),
      sortingFn: 'datetime',
      size: 110,
    },
    {
      id: 'unread',
      header: 'Unread',
      accessorFn: (row) => (row.tenant_unread_count || 0) + (row.owner_unread_count || 0),
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            {c.tenant_unread_count > 0 && <Badge color="cyan">{c.tenant_unread_count} T</Badge>}
            {c.owner_unread_count > 0 && <Badge color="purple">{c.owner_unread_count} O</Badge>}
            {!c.tenant_unread_count && !c.owner_unread_count && (
              <span style={{ fontSize: '12px', color: COLORS.textDim }}>—</span>
            )}
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: COLORS.textDim }}>
          {getValue() ? formatDate(getValue()) : '—'}
        </span>
      ),
      sortingFn: 'datetime',
      size: 130,
    },
  ], []);

  // Expanded row — AdminTable passes row.original (the data object)
  const renderExpandedRow = useCallback((data) => {
    return (
      <div style={{ padding: '8px 16px' }}>
        <button
          onClick={() => openConversation(data)}
          style={{ ...baseButton, background: COLORS.brand, color: '#000', fontSize: '12px', padding: '6px 16px' }}
        >
          Open Full Thread
        </button>
      </div>
    );
  }, []);

  // ── Detail View ──
  if (selectedConvo) {
    return (
      <ConversationDetail
        convo={selectedConvo}
        detail={convoDetail}
        loading={detailLoading}
        onClose={closeDetail}
        onStatusChange={(status) => {
          setConfirm({ action: 'status', id: selectedConvo.id, status, label: status });
        }}
        onDelete={() => {
          setConfirm({ action: 'delete', id: selectedConvo.id });
        }}
        confirm={confirm}
        onConfirm={() => {
          if (confirm.action === 'delete') deleteConversation(confirm.id);
          else updateStatus(confirm.id, confirm.status);
        }}
        onCancelConfirm={() => setConfirm(null)}
      />
    );
  }

  // ── List View ──
  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Total Conversations" value={stats?.totalConversations ?? 0}
          sub={`${stats?.activeConversations ?? 0} active this week`} accent={COLORS.brand} />
        <StatCard label="Messages Today" value={stats?.messagesToday ?? 0}
          sub={`${stats?.messagesThisWeek ?? 0} this week`} accent={COLORS.green} />
        <StatCard label="Total Messages" value={stats?.totalMessages ?? 0} accent={COLORS.purple} />
        <StatCard label="Delivery Queue" value={stats?.pendingDeliveryQueue ?? 0}
          sub={stats?.failedDeliveryQueue > 0 ? `${stats.failedDeliveryQueue} failed` : 'All clear'}
          accent={stats?.failedDeliveryQueue > 0 ? COLORS.red : stats?.pendingDeliveryQueue > 0 ? COLORS.amber : COLORS.green} />
      </div>

      {/* Conversations Table */}
      <AdminTable
        columns={columns}
        data={conversations}
        loading={loading}
        error={error}
        tableName="conversations"
        storageKey="messaging"
        emptyMessage="No conversations yet"
        onBulkDelete={handleBulkDelete}
        renderExpandedRow={renderExpandedRow}
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERSATION DETAIL VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ConversationDetail({ convo, detail, loading, onClose, onStatusChange, onDelete, confirm, onConfirm, onCancelConfirm }) {
  const conversation = detail?.conversation || convo;
  const messages = detail?.messages || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{
          ...baseButton, background: COLORS.border, color: COLORS.textMuted,
          fontSize: '12px', padding: '6px 14px',
        }}>
          Back
        </button>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: COLORS.text, flex: 1 }}>
          {conversation.listing_address || 'Unknown Address'}
        </h3>
        <Badge color={conversation.conversation_type === 'external_agent' ? 'amber' : 'blue'}>
          {conversation.conversation_type === 'external_agent' ? 'MLS Agent' : 'Internal'}
        </Badge>
        <Badge color={conversation.status === 'active' ? 'green' : conversation.status === 'blocked' ? 'red' : 'gray'}>
          {conversation.status}
        </Badge>
      </div>

      {/* Participants + Actions row */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap',
        padding: '14px 16px', background: COLORS.surface,
        borderRadius: '8px', border: `1px solid ${COLORS.border}`,
        alignItems: 'center',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <InfoRow label="Tenant" value={conversation.tenant_name || '—'} />
          <InfoRow label={conversation.conversation_type === 'external_agent' ? 'Agent' : 'Owner'} value={conversation.owner_name || '—'} />
          {conversation.external_agent_email && (
            <InfoRow label="Agent Email" value={conversation.external_agent_email} />
          )}
          {conversation.external_agent_phone && (
            <InfoRow label="Agent Phone" value={conversation.external_agent_phone} />
          )}
          <InfoRow label="Created" value={conversation.created_at ? formatDate(conversation.created_at) : '—'} />
          <InfoRow label="Last Activity" value={conversation.last_message_at ? formatDate(conversation.last_message_at) : '—'} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          {conversation.status === 'active' && (
            <>
              <ActionBtn label="Archive" color={COLORS.amber} onClick={() => onStatusChange('archived')} />
              <ActionBtn label="Block" color={COLORS.red} onClick={() => onStatusChange('blocked')} />
            </>
          )}
          {conversation.status === 'archived' && (
            <ActionBtn label="Reactivate" color={COLORS.green} onClick={() => onStatusChange('active')} />
          )}
          {conversation.status === 'blocked' && (
            <ActionBtn label="Unblock" color={COLORS.green} onClick={() => onStatusChange('active')} />
          )}
          <ActionBtn label="Delete" color={COLORS.red} onClick={onDelete} />
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: COLORS.red + '15', border: `1px solid ${COLORS.red}40`,
          borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: '13px', color: COLORS.text, flex: 1 }}>
            {confirm.action === 'delete'
              ? 'Delete this conversation and all its messages? This cannot be undone.'
              : `Change status to "${confirm.label}"?`}
          </span>
          <button onClick={onConfirm} style={{ ...baseButton, background: COLORS.red, color: '#fff', fontSize: '12px', padding: '6px 14px' }}>
            Confirm
          </button>
          <button onClick={onCancelConfirm} style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted, fontSize: '12px', padding: '6px 14px' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Message Thread */}
      <h4 style={{
        fontSize: '13px', fontWeight: 700, color: COLORS.textDim,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
      }}>
        Messages ({messages.length})
      </h4>

      {loading ? (
        <div style={{ padding: 20, color: COLORS.textDim, textAlign: 'center' }}>Loading messages...</div>
      ) : messages.length === 0 ? (
        <div style={{
          padding: '24px 16px', textAlign: 'center', color: COLORS.textDim, fontSize: '13px',
          background: COLORS.surface, borderRadius: '8px', border: `1px solid ${COLORS.border}`,
        }}>
          No messages in this conversation
        </div>
      ) : (
        <div style={{
          background: COLORS.surface, borderRadius: '8px',
          border: `1px solid ${COLORS.border}`, overflow: 'hidden',
        }}>
          {messages.map((msg, i) => {
            const isTenant = msg.sender_role === 'tenant';
            const isExternal = msg.sender_role === 'external';
            const roleColor = isExternal ? COLORS.amber : isTenant ? COLORS.brand : COLORS.purple;

            return (
              <div key={msg.id} style={{
                padding: '12px 16px',
                borderBottom: i < messages.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                borderLeft: `3px solid ${roleColor}`,
              }}>
                {/* Sender + Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text }}>
                    {msg.sender_name}
                  </span>
                  <Badge color={isExternal ? 'amber' : isTenant ? 'cyan' : 'purple'}>
                    {isExternal ? 'External' : msg.sender_role}
                  </Badge>
                  <span style={{ fontSize: '11px', color: COLORS.textDim, marginLeft: 'auto' }}>
                    {formatDate(msg.created_at)}
                  </span>
                </div>

                {/* Body */}
                <div style={{
                  fontSize: '13px', color: COLORS.textMuted, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.body}
                </div>

                {/* Delivery Channels */}
                {msg.deliveries && msg.deliveries.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {msg.deliveries.map((d, di) => (
                      <span key={di} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 4, fontSize: '10px', fontWeight: 700,
                        background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                        color: COLORS.textDim,
                      }} title={d.last_error || ''}>
                        <span>{CHANNEL_ICON[d.channel] || '?'}</span>
                        <span style={{ textTransform: 'uppercase' }}>{d.channel}</span>
                        <Badge color={STATUS_COLOR[d.status] || 'gray'} style={{ fontSize: '9px', padding: '0 4px' }}>
                          {d.status}
                          {d.attempts > 1 ? ` (${d.attempts}x)` : ''}
                        </Badge>
                        {d.last_error && (
                          <span style={{ color: COLORS.red, cursor: 'help' }} title={d.last_error}>!</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function InfoRow({ label, value }) {
  return (
    <div style={{ fontSize: '12px', marginBottom: 4 }}>
      <span style={{ fontWeight: 700, color: COLORS.textDim, width: 90, display: 'inline-block' }}>{label}:</span>
      <span style={{ color: COLORS.textMuted }}>{value}</span>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...baseButton, background: color + '20', color,
      border: `1px solid ${color}40`, fontSize: '11px',
      padding: '5px 14px', minWidth: 90,
    }}>
      {label}
    </button>
  );
}
