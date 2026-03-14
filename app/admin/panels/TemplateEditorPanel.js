'use client';

import { useState, useEffect } from 'react';
import { COLORS, Badge, baseButton } from '../shared';

export default function TemplateEditorPanel() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/admin/message-templates');
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  function startEditing(template) {
    setEditingId(template.id);
    setEditForm({
      subject: template.subject || '',
      body_html: template.body_html || '',
      body_text: template.body_text || '',
      is_active: template.is_active,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({});
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/message-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates(prev => prev.map(t => t.id === editingId ? updated : t));
        setEditingId(null);
        setEditForm({});
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function toggleActive(template) {
    try {
      const res = await fetch('/api/admin/message-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, is_active: !template.is_active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
      }
    } catch { /* silent */ }
  }

  if (loading) {
    return <div style={{ color: COLORS.textDim, padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  // Group by channel
  const grouped = {};
  templates.forEach(t => {
    if (!grouped[t.channel]) grouped[t.channel] = [];
    grouped[t.channel].push(t);
  });

  const channelColors = { sms: 'blue', email: 'purple', push: 'cyan' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>
          Edit notification templates used for SMS, email, and push messages.
          Templates use <code style={{ color: COLORS.brand, background: COLORS.bg, padding: '1px 4px', borderRadius: 3 }}>{'{{variable}}'}</code> interpolation.
        </p>
      </div>

      {Object.entries(grouped).map(([channel, channelTemplates]) => (
        <div key={channel} style={{ marginBottom: 28 }}>
          <h3 style={sectionTitle}>
            <Badge color={channelColors[channel] || 'gray'}>{channel.toUpperCase()}</Badge>
            <span style={{ marginLeft: 10 }}>{channel} Templates</span>
          </h3>

          {channelTemplates.map(template => (
            <div key={template.id} style={{
              background: COLORS.surface, borderRadius: '8px',
              border: `1px solid ${COLORS.border}`, padding: '16px',
              marginBottom: 12,
            }}>
              {/* Template header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: editingId === template.id ? 16 : 0 }}>
                <span style={{
                  fontSize: '14px', fontWeight: 700, color: COLORS.text,
                  fontFamily: 'monospace', flex: 1,
                }}>
                  {template.slug}
                </span>
                <Badge color={template.is_active ? 'green' : 'red'}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {editingId !== template.id && (
                  <>
                    <button
                      onClick={() => toggleActive(template)}
                      style={{
                        ...baseButton, background: 'transparent',
                        border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
                        fontSize: '11px', padding: '4px 10px',
                      }}
                    >
                      {template.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => startEditing(template)}
                      style={{ ...baseButton, background: COLORS.brand, color: '#000', fontSize: '11px', padding: '4px 10px' }}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              {/* Collapsed view */}
              {editingId !== template.id && (
                <div style={{ marginTop: 10 }}>
                  {template.subject && (
                    <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: COLORS.textDim }}>Subject: </span>
                      {template.subject}
                    </div>
                  )}
                  <div style={{
                    fontSize: '12px', color: COLORS.textDim, lineHeight: 1.5,
                    maxHeight: 60, overflow: 'hidden',
                  }}>
                    {template.body_text || template.body_html?.replace(/<[^>]+>/g, '').slice(0, 200) || '—'}
                  </div>
                </div>
              )}

              {/* Edit form */}
              {editingId === template.id && (
                <div>
                  {/* Subject (email/push only) */}
                  {channel !== 'sms' && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Subject</label>
                      <input
                        value={editForm.subject}
                        onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                        style={inputStyle}
                        placeholder="Email subject line"
                      />
                    </div>
                  )}

                  {/* Body text (all channels) */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Body Text</label>
                    <textarea
                      value={editForm.body_text}
                      onChange={e => setEditForm(f => ({ ...f, body_text: e.target.value }))}
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      placeholder="Plain text body"
                    />
                  </div>

                  {/* Body HTML (email only) */}
                  {channel === 'email' && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Body HTML</label>
                      <textarea
                        value={editForm.body_html}
                        onChange={e => setEditForm(f => ({ ...f, body_html: e.target.value }))}
                        rows={8}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                        placeholder="HTML body"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={cancelEditing} style={{
                      ...baseButton, background: 'transparent',
                      border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
                    }}>
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{
                      ...baseButton, background: COLORS.green, color: '#000',
                      opacity: saving ? 0.6 : 1,
                    }}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {templates.length === 0 && (
        <div style={{
          padding: '40px 16px', textAlign: 'center',
          color: COLORS.textDim, fontSize: '13px',
          background: COLORS.surface, borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
        }}>
          No message templates found. Templates are seeded in migration 038.
        </div>
      )}
    </div>
  );
}

const sectionTitle = {
  fontSize: '14px', fontWeight: 700, color: COLORS.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
  display: 'flex', alignItems: 'center',
};

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: COLORS.textDim, textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 4,
};

const inputStyle = {
  width: '100%', background: COLORS.bg,
  border: `1px solid ${COLORS.border}`, borderRadius: '6px',
  padding: '8px 12px', color: COLORS.text,
  fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box',
};
