'use client';

import { useState } from 'react';

export default function AddEntryForm({ fields, onSave, onCancel }) {
  const [values, setValues] = useState(() => {
    const initial = {};
    fields.forEach(f => { initial[f.key] = f.defaultValue || ''; });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(values);
    setSaving(false);
    // Reset form
    const initial = {};
    fields.forEach(f => { initial[f.key] = f.defaultValue || ''; });
    setValues(initial);
  };

  return (
    <form className="add-entry-form" onSubmit={handleSubmit}>
      <div className="add-entry-fields">
        {fields.map(field => (
          <div key={field.key} className="add-entry-field">
            <label className="add-entry-label">{field.label}</label>
            {field.type === 'select' ? (
              <select
                className="add-entry-input"
                value={values[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                required={field.required}
              >
                <option value="">Select…</option>
                {field.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                className="add-entry-input"
                placeholder={field.placeholder || ''}
                value={values[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                required={field.required}
                rows={2}
              />
            ) : (
              <input
                className="add-entry-input"
                type={field.type || 'text'}
                placeholder={field.placeholder || ''}
                value={values[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
      <div className="add-entry-actions">
        <button type="submit" className="add-entry-btn save" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="add-entry-btn cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
