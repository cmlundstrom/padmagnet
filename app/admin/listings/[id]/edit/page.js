'use client';

// Admin inline-edit for any listing. Saves go via PUT /api/admin/listings/[id]
// which by default flips status → active (admin's edit IS the approval).
// Use "Save (keep status)" when polishing an already-active listing where
// you don't want to reset the renewal clock or fire the approval email.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, baseButton } from '../../../shared';

const PROPERTY_TYPES = ['Single Family', 'Apartment', 'Condo', 'Townhouse', 'Duplex', 'Villa', 'Mobile Home'];
const LEASE_TERMS = [{ key: '3', label: '3 Months' }, { key: '6', label: '6 Months' }, { key: '12', label: '12 Months' }];

// Next 14 + React 18 hands client-component `params` as a plain object.
// (React 19 + Next 15 will deliver it as a Promise that needs `use()`.)
export default function AdminEditListing({ params }) {
  const { id } = params;
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editNote, setEditNote] = useState('');

  const fetchListing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/listings/${id}`);
      if (!res.ok) throw new Error(await res.text() || 'Failed to load');
      const data = await res.json();
      setListing(data);
      setForm({
        street_number: data.street_number || '',
        street_name: data.street_name || '',
        city: data.city || '',
        state_or_province: data.state_or_province || 'FL',
        postal_code: data.postal_code || '',
        property_sub_type: data.property_sub_type || '',
        list_price: data.list_price ?? '',
        bedrooms_total: data.bedrooms_total ?? '',
        bathrooms_total: data.bathrooms_total ?? '',
        living_area: data.living_area ?? '',
        year_built: data.year_built ?? '',
        public_remarks: data.public_remarks || '',
        lease_term: data.lease_term || '',
        available_date: data.available_date || '',
        pets_allowed: data.pets_allowed || '',
        fenced_yard: !!data.fenced_yard,
        furnished: !!data.furnished,
        pool: !!data.pool,
        parking_spaces: data.parking_spaces ?? '',
        listing_agent_name: data.listing_agent_name || '',
        listing_agent_email: data.listing_agent_email || '',
        listing_agent_phone: data.listing_agent_phone || '',
        photos: Array.isArray(data.photos) ? data.photos : [],
      });
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchListing(); }, [fetchListing]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const removePhoto = (idx) => update('photos', form.photos.filter((_, i) => i !== idx));

  const save = async (keepStatus) => {
    setSaving(true);
    try {
      const url = `/api/admin/listings/${id}${keepStatus ? '?keep_status=1' : ''}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, edit_note: editNote }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      // Bounce back to admin listings panel — the new state will be reflected
      // in the listings list on next focus.
      router.push('/admin#listings');
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={styles.page}><div style={styles.center}>Loading…</div></div>;
  }
  if (error) {
    return <div style={styles.page}><div style={styles.center}>Error: {error}</div></div>;
  }

  const isPending = listing?.status === 'pending_review';
  const isDraft = listing?.status === 'draft';

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Admin banner — always visible */}
        <div style={styles.adminBanner}>
          <strong>⚠️ Editing as admin</strong> — saves go live immediately and the owner
          gets an email. Use <em>Save (keep status)</em> if you only want to fix metadata
          on an already-active listing without resetting the 30-day renewal clock.
        </div>

        {/* Status pill */}
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>Current status:</span>
          <span style={{
            ...styles.statusPill,
            background: isPending ? '#7C3AED22' : isDraft ? '#F59E0B22' : '#22C55E22',
            color: isPending ? '#A78BFA' : isDraft ? '#F59E0B' : '#22C55E',
            border: `1px solid ${isPending ? '#7C3AED44' : isDraft ? '#F59E0B44' : '#22C55E44'}`,
          }}>{listing?.status?.toUpperCase()}</span>
          <a
            href={`/listing/${id}?admin_preview=1`}
            target="_blank"
            rel="noopener"
            style={{ ...baseButton, marginLeft: 'auto', background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, fontSize: '12px' }}
          >
            👁 Open Full Render
          </a>
          <button onClick={() => router.push('/admin#listings')} style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, fontSize: '12px' }}>
            ← Back to Listings
          </button>
        </div>

        <h2 style={styles.h2}>Address</h2>
        <div style={styles.row3}>
          <Field label="Street #" value={form.street_number} onChange={v => update('street_number', v)} />
          <Field label="Street Name" value={form.street_name} onChange={v => update('street_name', v)} />
          <Field label="City" value={form.city} onChange={v => update('city', v)} />
          <Field label="State" value={form.state_or_province} onChange={v => update('state_or_province', v)} />
          <Field label="Zip" value={form.postal_code} onChange={v => update('postal_code', v)} />
        </div>

        <h2 style={styles.h2}>Property Details</h2>
        <div style={styles.row3}>
          <Field label="Monthly Rent ($)" value={form.list_price} onChange={v => update('list_price', v)} type="number" />
          <SelectField label="Type" value={form.property_sub_type} onChange={v => update('property_sub_type', v)} options={PROPERTY_TYPES} />
          <Field label="Beds" value={form.bedrooms_total} onChange={v => update('bedrooms_total', v)} type="number" />
          <Field label="Baths" value={form.bathrooms_total} onChange={v => update('bathrooms_total', v)} type="number" />
          <Field label="Sq Ft" value={form.living_area} onChange={v => update('living_area', v)} type="number" />
          <Field label="Year Built" value={form.year_built} onChange={v => update('year_built', v)} type="number" />
          <Field label="Parking Spaces" value={form.parking_spaces} onChange={v => update('parking_spaces', v)} type="number" />
        </div>

        <h2 style={styles.h2}>Description</h2>
        <textarea
          value={form.public_remarks}
          onChange={e => update('public_remarks', e.target.value.slice(0, 500))}
          maxLength={500}
          rows={6}
          style={{ ...styles.textarea }}
          placeholder="Property description (max 500 chars)"
        />
        <div style={styles.charCount}>{(form.public_remarks || '').length}/500</div>

        <h2 style={styles.h2}>Lease & Features</h2>
        <div style={styles.row3}>
          <SelectField label="Min Lease Term" value={form.lease_term} onChange={v => update('lease_term', v)} options={LEASE_TERMS.map(x => x.key)} />
          <Field label="Available Date" value={form.available_date} onChange={v => update('available_date', v)} type="date" />
          <SelectField label="Pets Allowed" value={form.pets_allowed} onChange={v => update('pets_allowed', v)} options={['', 'Yes', 'No', 'Conditional']} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
          <CheckField label="Fenced Yard" checked={form.fenced_yard} onChange={v => update('fenced_yard', v)} />
          <CheckField label="Furnished" checked={form.furnished} onChange={v => update('furnished', v)} />
          <CheckField label="Pool" checked={form.pool} onChange={v => update('pool', v)} />
        </div>

        <h2 style={styles.h2}>Contact</h2>
        <div style={styles.row3}>
          <Field label="Agent / Owner Name" value={form.listing_agent_name} onChange={v => update('listing_agent_name', v)} />
          <Field label="Email" value={form.listing_agent_email} onChange={v => update('listing_agent_email', v)} />
          <Field label="Phone" value={form.listing_agent_phone} onChange={v => update('listing_agent_phone', v)} />
        </div>

        <h2 style={styles.h2}>Photos ({form.photos?.length || 0})</h2>
        <p style={styles.help}>Admin web edit can only remove photos. Owners add new photos in the mobile app.</p>
        <div style={styles.photoGrid}>
          {(form.photos || []).map((p, i) => (
            <div key={p.url || i} style={styles.photoTile}>
              <img src={p.thumb_url || p.url} alt={`Photo ${i + 1}`} style={styles.photoImg} />
              <div style={styles.photoOverlay}>
                <span style={styles.photoIdx}>{i === 0 ? 'Hero' : `#${i + 1}`}</span>
                <button onClick={() => removePhoto(i)} style={styles.photoDelete}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <h2 style={styles.h2}>Edit Note (optional, for owner email)</h2>
        <textarea
          value={editNote}
          onChange={e => setEditNote(e.target.value.slice(0, 240))}
          rows={2}
          maxLength={240}
          placeholder="What did you adjust? Goes into the owner's notification email."
          style={{ ...styles.textarea, fontSize: 13 }}
        />

        <div style={styles.actionBar}>
          <button onClick={() => router.push('/admin#listings')} style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted }}>
            Cancel
          </button>
          <button onClick={() => save(true)} disabled={saving} style={{ ...baseButton, background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}>
            Save (keep status)
          </button>
          <button onClick={() => save(false)} disabled={saving} style={{ ...baseButton, background: COLORS.green, color: '#000', fontWeight: 700 }}>
            {saving ? 'Saving…' : isPending ? '✓ Save & Approve' : '✓ Save & Re-Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} style={styles.input}>
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </label>
  );
}

function CheckField({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.text, fontSize: 13, cursor: 'pointer' }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const styles = {
  page: { minHeight: '100vh', background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" },
  container: { maxWidth: 920, margin: '0 auto', padding: '24px 20px 80px' },
  center: { padding: 80, textAlign: 'center', color: COLORS.textMuted },
  adminBanner: {
    background: '#DC262611',
    border: '1px solid #DC262644',
    borderLeft: '4px solid #DC2626',
    color: '#FCA5A5',
    padding: '14px 18px',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.55,
    marginBottom: 16,
  },
  statusRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
  },
  statusLabel: { fontSize: 12, color: COLORS.textDim, textTransform: 'uppercase', fontWeight: 700 },
  statusPill: { padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  h2: { fontSize: 14, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '24px 0 10px' },
  row3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: { fontSize: 11, color: COLORS.textDim, fontWeight: 600 },
  input: {
    background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6,
    padding: '8px 10px', color: COLORS.text, fontSize: 13, outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box', background: COLORS.surface,
    border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '10px 12px',
    color: COLORS.text, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    resize: 'vertical',
  },
  charCount: { fontSize: 11, color: COLORS.textDim, textAlign: 'right', marginTop: 4 },
  help: { fontSize: 12, color: COLORS.textDim, marginBottom: 8 },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  photoTile: { position: 'relative', borderRadius: 6, overflow: 'hidden', border: `1px solid ${COLORS.border}` },
  photoImg: { width: '100%', height: 100, objectFit: 'cover', display: 'block' },
  photoOverlay: {
    position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: 4, pointerEvents: 'none',
  },
  photoIdx: {
    background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, padding: '2px 6px',
    borderRadius: 4, fontWeight: 700,
  },
  photoDelete: {
    background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: 4,
    width: 22, height: 22, fontSize: 12, cursor: 'pointer', pointerEvents: 'auto',
  },
  actionBar: {
    display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 32,
    paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, position: 'sticky', bottom: 0,
    background: COLORS.bg,
  },
};
