import { createServiceClient } from '../../../../../lib/supabase';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { writeAuditLogBatch } from '../../../../../lib/api-helpers';
import { geocodeAddress } from '../../../../../lib/geocode';
import { sendTemplateEmail } from '../../../../../lib/email';
import { sanitizeText, sanitizeName } from '../../../../../lib/validate';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Field whitelist intentionally mirrors the owner endpoint so admin-edit
// surface stays in sync. Mass-assignment safe — anything not in this list
// is silently dropped.
const ALLOWED_FIELDS = [
  'street_number', 'street_name', 'city', 'state_or_province', 'postal_code', 'county',
  'latitude', 'longitude',
  'property_type', 'property_sub_type', 'list_price', 'bedrooms_total', 'bathrooms_total',
  'living_area', 'lot_size_area', 'year_built',
  'public_remarks', 'tenant_contact_instructions',
  'lease_term', 'available_date',
  'pets_allowed', 'pets_deposit', 'fenced_yard', 'furnished', 'hoa_fee', 'parking_spaces', 'pool',
  'photos', 'virtual_tour_url',
  'listing_agent_name', 'listing_office_name', 'listing_agent_phone', 'listing_agent_email',
];

const TEXT_FIELDS = ['public_remarks', 'tenant_contact_instructions'];
const NAME_FIELDS = ['listing_agent_name', 'listing_office_name'];
const ADDRESS_FIELDS = ['street_number', 'street_name', 'city', 'state_or_province', 'postal_code'];

// GET — fetch any listing (admin override, no ownership check). Used by the
// admin edit page and the snapshot drawer's "load fresh from server" path.
export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — admin edit + auto-approve. Reuses the owner whitelist + sanitize
// pipeline but bypasses ownership checks. By default, saving here flips
// the listing to status='active' (admin's edit IS the approval). Pass
// `?keep_status=1` to update fields without changing status (e.g., when
// fixing typos on an already-active listing).
export async function PUT(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const keepStatus = url.searchParams.get('keep_status') === '1';
    const body = await request.json();
    const editNote = (body.edit_note || '').trim();
    const adminId = auth?.user?.id || null;

    const supabase = createServiceClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Whitelist + sanitize
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] === undefined) continue;
      if (TEXT_FIELDS.includes(field)) {
        updates[field] = sanitizeText(body[field], 5000);
      } else if (NAME_FIELDS.includes(field)) {
        updates[field] = sanitizeName(body[field]);
      } else {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0 && !keepStatus) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Re-geocode if address changed (mirrors owner endpoint)
    const addressChanged = ADDRESS_FIELDS.some(f => updates[f] !== undefined);
    if (addressChanged) {
      const street = [updates.street_number ?? existing.street_number, updates.street_name ?? existing.street_name].filter(Boolean).join(' ');
      const city = updates.city ?? existing.city;
      const state = updates.state_or_province ?? existing.state_or_province ?? 'FL';
      const zip = updates.postal_code ?? existing.postal_code;
      if (street && city) {
        const coords = await geocodeAddress(street, city, state, zip);
        if (coords.latitude) {
          updates.latitude = coords.latitude;
          updates.longitude = coords.longitude;
        }
      }
    }

    // Default behaviour: admin edit = admin approval. Listing flips to
    // active. expires_at gets a fresh 30 days only when transitioning out
    // of pending_review (so editing an already-active listing doesn't
    // reset the renewal clock).
    const wasPending = existing.status === 'pending_review';
    if (!keepStatus) {
      updates.status = 'active';
      updates.is_active = true;
      updates.admin_reviewed_at = new Date().toISOString();
      updates.admin_reviewed_by = adminId;
      updates.admin_review_reason = null;
      updates.admin_review_note = null;
      if (wasPending) {
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const { data: saved, error: updateErr } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit: per-field diff so the audit log shows exactly what admin changed.
    const auditEntries = [];
    for (const [field, newVal] of Object.entries(updates)) {
      const oldVal = existing[field];
      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
      auditEntries.push({
        tableName: 'listings',
        rowId: id,
        action: keepStatus ? 'admin_edit' : 'admin_edit_and_approve',
        fieldChanged: field,
        oldValue: oldVal,
        newValue: newVal,
        adminUser: adminId,
        metadata: editNote ? { edit_note: editNote } : undefined,
      });
    }
    if (auditEntries.length > 0) {
      await writeAuditLogBatch(auditEntries);
    }

    // Email owner when admin auto-approved a pending listing. Skip when
    // keepStatus (admin just polished an active listing) to avoid noise.
    if (!keepStatus && wasPending && saved.owner_user_id) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', saved.owner_user_id)
        .single();
      if (ownerProfile?.email) {
        const address = [saved.street_number, saved.street_name].filter(Boolean).join(' ');
        const fullAddress = [address, saved.city, saved.state_or_province].filter(Boolean).join(', ');
        sendTemplateEmail('listing_admin_edited', ownerProfile.email, {
          owner_name: ownerProfile.display_name || 'Property Owner',
          listing_address: fullAddress,
          edit_note: editNote || 'Minor adjustments to formatting / fields.',
        }).catch(() => {});
      }
    }

    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
