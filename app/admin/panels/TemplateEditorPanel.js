'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS, Badge, baseButton } from '../shared';

const SHARE_DEFAULTS = {
  share_subject: 'Check out this rental: {{address}}, {{city}} — {{price}}',
  share_message: 'Check out this rental on PadMagnet! {{address}}, {{city}} — {{price}}\nhttps://padmagnet.com/listing/{{id}}',
};

function ShareTemplateSection() {
  const [fields, setFields] = useState({ ...SHARE_DEFAULTS });
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config?keys=share_subject,share_message');
      if (res.ok) {
        const data = await res.json();
        setFields(f => ({
          share_subject: data.share_subject || f.share_subject,
          share_message: data.share_message || f.share_message,
        }));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch('/api/admin/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'share_subject', value: fields.share_subject }),
        }),
        fetch('/api/admin/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'share_message', value: fields.share_message }),
        }),
      ]);
      setSaved(true);
    } catch { /* silent */ }
    setSaving(false);
  };

  const variables = ['{{address}}', '{{city}}', '{{price}}', '{{id}}'];

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: '16px', fontWeight: 800, color: COLORS.text,
        letterSpacing: '-0.02em', marginBottom: 16,
        paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}`,
      }}>
        Share Templates
      </h2>
      <p style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: 16 }}>
        Controls the text used when users tap "Share" on a listing detail page.
        The subject line is used when sharing via email.
      </p>

      <div style={{
        background: COLORS.surface, borderRadius: 8,
        border: `1px solid ${COLORS.border}`, padding: 16,
      }}>
        {/* Variables reference */}
        <div style={{ fontSize: '11px', color: COLORS.textDim, marginBottom: 14, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, marginRight: 2 }}>Variables:</span>
          {variables.map(v => (
            <span key={v} style={{
              background: COLORS.bg, padding: '1px 6px', borderRadius: 3,
              fontFamily: 'monospace', fontSize: '10px', color: COLORS.brand,
              border: `1px solid ${COLORS.border}`,
            }}>
              {v}
            </span>
          ))}
        </div>

        {loading ? (
          <p style={{ color: COLORS.textDim, fontSize: '13px' }}>Loading…</p>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email Subject Line</label>
              <input
                value={fields.share_subject}
                onChange={e => { setFields(f => ({ ...f, share_subject: e.target.value })); setSaved(false); }}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Share Message Body</label>
              <textarea
                value={fields.share_message}
                onChange={e => { setFields(f => ({ ...f, share_message: e.target.value })); setSaved(false); }}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saved || saving}
                style={{
                  ...baseButton,
                  background: saved ? COLORS.border : COLORS.brand,
                  color: saved ? COLORS.textDim : '#000',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save Changes'}
              </button>
              {!saved && (
                <span style={{ fontSize: '12px', color: COLORS.amber }}>Unsaved changes</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
      source: template.source,
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
        body: JSON.stringify({ id: template.id, source: template.source, is_active: !template.is_active }),
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

  // Group: first by source category, then by channel
  const groups = {};
  templates.forEach(t => {
    const category = t.source === 'email_templates' ? 'Transactional Emails' : 'Messaging Notifications';
    if (!groups[category]) groups[category] = {};
    const ch = t.channel.toUpperCase();
    if (!groups[category][ch]) groups[category][ch] = [];
    groups[category][ch].push(t);
  });

  const categoryOrder = ['Messaging Notifications', 'Transactional Emails'];
  const channelColors = { SMS: '#3B82F6', EMAIL: '#A855F7', PUSH: '#22D3EE' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>
          Review and edit all notification templates. Templates use{' '}
          <code style={{ color: COLORS.brand, background: COLORS.bg, padding: '1px 4px', borderRadius: 3 }}>{'{{variable}}'}</code>{' '}
          interpolation. Changes take effect immediately.
        </p>
      </div>

      {categoryOrder.map(category => {
        const channels = groups[category];
        if (!channels) return null;
        return (
          <div key={category} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: '16px', fontWeight: 800, color: COLORS.text,
              letterSpacing: '-0.02em', marginBottom: 16,
              paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}`,
            }}>
              {category}
            </h2>

            {Object.entries(channels).map(([channel, channelTemplates]) => (
              <div key={channel} style={{ marginBottom: 24 }}>
                <h3 style={sectionTitle}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                    fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
                    background: (channelColors[channel] || '#666') + '20',
                    color: channelColors[channel] || '#666',
                  }}>
                    {channel}
                  </span>
                </h3>

                {channelTemplates.map(template => (
                  <div key={template.id} style={{
                    background: COLORS.surface, borderRadius: '8px',
                    border: `1px solid ${COLORS.border}`, padding: '16px',
                    marginBottom: 12,
                  }}>
                    {/* Template header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: editingId === template.id ? 16 : 0, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '14px', fontWeight: 700, color: COLORS.text,
                        fontFamily: 'monospace',
                      }}>
                        {template.slug}
                      </span>
                      <Badge color={template.is_active ? 'green' : 'red'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div style={{ flex: 1 }} />
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
                          <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, color: COLORS.textDim }}>Subject: </span>
                            {template.subject}
                          </div>
                        )}

                        {/* Variables */}
                        {template.variables && template.variables.length > 0 && (
                          <div style={{ fontSize: '11px', color: COLORS.textDim, marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, marginRight: 2 }}>Variables:</span>
                            {template.variables.map(v => (
                              <span key={v} style={{
                                background: COLORS.bg, padding: '1px 6px', borderRadius: 3,
                                fontFamily: 'monospace', fontSize: '10px', color: COLORS.brand,
                                border: `1px solid ${COLORS.border}`,
                              }}>
                                {`{{${v}}}`}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Body preview */}
                        <div style={{
                          fontSize: '12px', color: COLORS.textDim, lineHeight: 1.5,
                          maxHeight: 80, overflow: 'hidden',
                          background: COLORS.bg, borderRadius: 6, padding: '8px 10px',
                          border: `1px solid ${COLORS.border}`,
                        }}>
                          {template.body_text || template.body_html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) || <span style={{ color: COLORS.textDim, fontStyle: 'italic' }}>No body content — uses auto-generated layout</span>}
                        </div>
                      </div>
                    )}

                    {/* Edit form */}
                    {editingId === template.id && (
                      <div>
                        {/* Subject */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={labelStyle}>Subject</label>
                          <input
                            value={editForm.subject}
                            onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                            style={inputStyle}
                            placeholder="Email subject line"
                          />
                        </div>

                        {/* Body text (SMS templates) */}
                        {template.channel === 'sms' && (
                          <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>Body Text</label>
                            <textarea
                              value={editForm.body_text}
                              onChange={e => setEditForm(f => ({ ...f, body_text: e.target.value }))}
                              rows={4}
                              style={{ ...inputStyle, resize: 'vertical' }}
                              placeholder="SMS body text"
                            />
                          </div>
                        )}

                        {/* Body HTML (email templates) */}
                        {template.channel === 'email' && (
                          <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>Body HTML</label>
                            <textarea
                              value={editForm.body_html}
                              onChange={e => setEditForm(f => ({ ...f, body_html: e.target.value }))}
                              rows={12}
                              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                              placeholder="HTML body — use {{variable}} for dynamic values"
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
          </div>
        );
      })}

      {/* Share Templates — stored in site_config */}
      <ShareTemplateSection />

      {templates.length === 0 && (
        <div style={{
          padding: '40px 16px', textAlign: 'center',
          color: COLORS.textDim, fontSize: '13px',
          background: COLORS.surface, borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
        }}>
          No templates found. Templates are seeded in migrations 012 and 038.
        </div>
      )}
    </div>
  );
}

const sectionTitle = {
  fontSize: '13px', fontWeight: 700, color: COLORS.textMuted,
  marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
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
