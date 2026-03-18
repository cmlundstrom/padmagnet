'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS, Badge, baseButton } from '../shared';

const CONFIG_KEYS = [
  { key: 'owner_empty_state', label: 'Listings tab empty state content' },
  { key: 'owner_upgrade_page', label: 'Tier comparison / pricing page content' },
  { key: 'owner_post_activation', label: 'Post-activation celebration + upsell content' },
  { key: 'owner_explore_tab', label: 'Explore tab content blocks' },
  { key: 'market_stats', label: 'South Florida market statistics' },
];

export default function SalesPagesPanel() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [editJson, setEditJson] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const keys = CONFIG_KEYS.map(c => c.key).join(',');
      const res = await fetch(`/api/admin/config?keys=${keys}`);
      if (res.ok) {
        setConfigs(await res.json());
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startEditing = (key) => {
    const value = configs[key];
    let formatted = '';
    if (value) {
      try {
        // If it's already an object, format it; if string, try parsing first
        const obj = typeof value === 'string' ? JSON.parse(value) : value;
        formatted = JSON.stringify(obj, null, 2);
      } catch {
        formatted = typeof value === 'string' ? value : JSON.stringify(value);
      }
    } else {
      formatted = '{\n  \n}';
    }
    setEditJson(formatted);
    setJsonError(null);
    setEditingKey(key);
    // Auto-expand
    setExpanded(prev => ({ ...prev, [key]: true }));
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditJson('');
    setJsonError(null);
  };

  const handleSave = async () => {
    // Validate JSON
    let parsed;
    try {
      parsed = JSON.parse(editJson);
    } catch (e) {
      setJsonError(`Invalid JSON: ${e.message}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editingKey, value: parsed }),
      });
      if (res.ok) {
        setConfigs(prev => ({ ...prev, [editingKey]: parsed }));
        setEditingKey(null);
        setEditJson('');
        setJsonError(null);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleReset = async (key) => {
    if (!confirm(`Reset "${key}" to defaults? This will delete the stored value.`)) return;
    setResetting(key);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: '' }),
      });
      if (res.ok) {
        setConfigs(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        if (editingKey === key) cancelEditing();
      }
    } catch { /* silent */ }
    setResetting(null);
  };

  const hasValue = (key) => {
    const val = configs[key];
    if (!val) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (typeof val === 'object' && Object.keys(val).length === 0) return false;
    return true;
  };

  if (loading) {
    return <div style={{ color: COLORS.textDim, padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>
          Edit owner-facing content. These values override hardcoded defaults in the mobile app.
          Changes take effect on next app load.
        </p>
      </div>

      <div style={{
        background: COLORS.surface,
        borderRadius: '8px',
        border: '1px solid ' + COLORS.border,
        padding: '16px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.text, marginBottom: '8px' }}>
          Preview on Device
        </h3>
        <p style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px' }}>
          Open these links on your phone to preview sales pages as an admin (even with active listings).
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'Listings Empty State', path: '/(owner)/listings?preview=true' },
            { label: 'Post-Activation', path: '/owner/post-activation?preview=true' },
            { label: 'Upgrade Page', path: '/owner/upgrade?preview=true' },
          ].map(link => (
            <button
              key={link.path}
              onClick={() => {
                const deepLink = 'padmagnet://' + link.path;
                navigator.clipboard?.writeText(deepLink);
                alert('Copied deep link: ' + deepLink);
              }}
              style={{
                ...baseButton,
                background: COLORS.brand + '20',
                color: COLORS.brand,
                fontSize: '11px',
                padding: '6px 12px',
                border: '1px solid ' + COLORS.brand + '40',
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {CONFIG_KEYS.map(({ key, label }) => {
        const isExpanded = expanded[key];
        const isEditing = editingKey === key;
        const configured = hasValue(key);

        return (
          <div key={key} style={{
            background: COLORS.surface, borderRadius: 8,
            border: `1px solid ${COLORS.border}`, padding: 16,
            marginBottom: 12,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: '14px', fontWeight: 700, color: COLORS.text,
                fontFamily: 'monospace',
              }}>
                {key}
              </span>
              <Badge color={configured ? 'green' : 'gray'}>
                {configured ? 'Configured' : 'Using Defaults'}
              </Badge>
              <div style={{ flex: 1 }} />
              {!isEditing && (
                <>
                  <button
                    onClick={() => handleReset(key)}
                    disabled={resetting === key}
                    style={{
                      ...baseButton, background: 'transparent',
                      border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
                      fontSize: '11px', padding: '4px 10px',
                      opacity: resetting === key ? 0.6 : 1,
                    }}
                  >
                    {resetting === key ? 'Resetting...' : 'Reset to Defaults'}
                  </button>
                  <button
                    onClick={() => startEditing(key)}
                    style={{ ...baseButton, background: COLORS.brand, color: '#000', fontSize: '11px', padding: '4px 10px' }}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            {/* Description */}
            <div style={{ fontSize: '11px', color: COLORS.textDim, marginTop: 4, marginBottom: 8 }}>
              {label}
            </div>

            {/* Expand toggle */}
            {!isEditing && (
              <button
                onClick={() => toggleExpand(key)}
                style={{
                  ...baseButton, background: 'transparent', padding: '4px 0',
                  color: COLORS.brand, fontSize: '12px', fontWeight: 600,
                  border: 'none',
                }}
              >
                {isExpanded ? 'Collapse ▴' : 'Expand ▾'}
              </button>
            )}

            {/* Collapsed preview */}
            {isExpanded && !isEditing && (
              <div style={{
                marginTop: 8,
                fontSize: '12px', color: COLORS.textDim, lineHeight: 1.5,
                background: COLORS.bg, borderRadius: 6, padding: '8px 10px',
                border: `1px solid ${COLORS.border}`,
                fontFamily: 'monospace', whiteSpace: 'pre-wrap',
                maxHeight: 200, overflow: 'auto',
              }}>
                {configured
                  ? JSON.stringify(typeof configs[key] === 'string' ? (() => { try { return JSON.parse(configs[key]); } catch { return configs[key]; } })() : configs[key], null, 2)
                  : '(no value — using app defaults)'}
              </div>
            )}

            {/* Edit mode */}
            {isEditing && (
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={editJson}
                  onChange={e => {
                    setEditJson(e.target.value);
                    setJsonError(null);
                  }}
                  rows={14}
                  style={{
                    width: '100%', background: COLORS.bg,
                    border: `1px solid ${jsonError ? COLORS.red : COLORS.border}`,
                    borderRadius: '6px', padding: '8px 12px',
                    color: COLORS.text, fontSize: '12px',
                    fontFamily: 'monospace', resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                  placeholder='{ "key": "value" }'
                />
                {jsonError && (
                  <div style={{
                    fontSize: '11px', color: COLORS.red, marginTop: 4,
                    fontFamily: 'monospace',
                  }}>
                    {jsonError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
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
        );
      })}
    </div>
  );
}
