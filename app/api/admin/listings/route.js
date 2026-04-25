import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLog, writeAuditLogBatch } from '../../../../lib/api-helpers';
import { sendTemplateEmail } from '../../../../lib/email';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const LISTING_COLUMNS = 'id, listing_key, listing_id, street_number, street_name, city, state_or_province, postal_code, property_type, property_sub_type, list_price, bedrooms_total, bathrooms_total, living_area, pets_allowed, fenced_yard, source, owner_user_id, status, is_active, is_boosted, view_count, inquiry_count, photos, public_remarks, confirmation_code, expires_at, created_at, updated_at, admin_review_reason, admin_review_note, admin_reviewed_at, admin_reviewed_by, listing_agent_name, listing_agent_email';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServiceClient();
    // Fetch recent MLS listings (capped at 1000 for performance)
    const { data: recentListings, error } = await supabase
      .from('listings')
      .select(LISTING_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Always include ALL owner listings (even if outside the 1000 window)
    const { data: ownerListings } = await supabase
      .from('listings')
      .select(LISTING_COLUMNS)
      .eq('source', 'owner')
      .order('created_at', { ascending: false });

    // Merge — deduplicate by id
    const seen = new Set(recentListings.map(l => l.id));
    const merged = [...recentListings];
    for (const ol of (ownerListings || [])) {
      if (!seen.has(ol.id)) {
        merged.push(ol);
        seen.add(ol.id);
      }
    }

    return NextResponse.json(merged);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ids, changes } = body;

    if (!ids?.length || !changes) {
      return NextResponse.json({ error: 'ids[] and changes are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch current rows for audit diff
    const { data: oldRows, error: fetchErr } = await supabase
      .from('listings')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Apply update
    const { data: updatedRows, error: updateErr } = await supabase
      .from('listings')
      .update(changes)
      .in('id', ids)
      .select(LISTING_COLUMNS);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Write audit logs for each changed field on each row
    const auditEntries = [];
    for (const oldRow of oldRows) {
      for (const [field, newVal] of Object.entries(changes)) {
        const oldVal = oldRow[field];
        if (String(oldVal) !== String(newVal)) {
          let action = 'update';
          if (field === 'is_active') {
            action = newVal ? 'unsuppress' : 'suppress';
          }
          auditEntries.push({
            tableName: 'listings',
            rowId: oldRow.id,
            action,
            fieldChanged: field,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
    }
    await writeAuditLogBatch(auditEntries);

    return NextResponse.json(updatedRows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Canned reasons surfaced in the admin Send-Back modal. Mapped to a
// human-readable label that gets interpolated into the email template
// via {{review_reason}}.
const SEND_BACK_REASONS = {
  photos_quality:   'Photos are blurry or low quality',
  address_invalid:  'Address is incomplete or invalid',
  description_thin: 'Description is too short or missing key info',
  price_unrealistic:'Price seems unrealistic for the market',
  guidelines:       'Listing violates our content guidelines',
  other:            'Other (see note)',
};

// PUT /api/admin/listings — approve / reject / send_back a pending_review listing
export async function PUT(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, action, rejection_reason, review_reason, review_note } = await request.json();

    if (!id || !['approve', 'reject', 'send_back'].includes(action)) {
      return NextResponse.json({ error: 'id and action (approve|reject|send_back) required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const adminId = auth?.user?.id || null;
    const reviewedAt = new Date().toISOString();

    // Fetch listing
    const { data: listing, error: fetchErr } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'pending_review') {
      return NextResponse.json({ error: 'Listing is not pending review' }, { status: 400 });
    }

    // Fetch owner profile separately (FK is to auth.users, not profiles)
    let ownerEmail = null;
    let ownerName = 'Property Owner';
    if (listing.owner_user_id) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', listing.owner_user_id)
        .single();
      ownerEmail = ownerProfile?.email;
      ownerName = ownerProfile?.display_name || 'Property Owner';
    }
    const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
    const fullAddress = [address, listing.city, listing.state_or_province].filter(Boolean).join(', ');

    if (action === 'approve') {
      // Approve: set active + 30-day expiry. Clear any prior revision note.
      const { data: updated, error: updateErr } = await supabase
        .from('listings')
        .update({
          status: 'active',
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          admin_reviewed_at: reviewedAt,
          admin_reviewed_by: adminId,
          admin_review_reason: null,
          admin_review_note: null,
        })
        .eq('id', id)
        .select(LISTING_COLUMNS)
        .single();

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

      await writeAuditLogBatch([{
        tableName: 'listings', rowId: id, action: 'approve',
        fieldChanged: 'status', oldValue: 'pending_review', newValue: 'active',
        adminUser: adminId,
      }]);

      if (ownerEmail) {
        sendTemplateEmail('listing_approved', ownerEmail, {
          owner_name: ownerName,
          confirmation_code: listing.confirmation_code || '',
          listing_address: fullAddress,
        }).catch(() => {});
      }

      return NextResponse.json(updated);
    }

    if (action === 'send_back') {
      // Send Back: revisable. Status → draft, persist reason+note for the
      // owner to see in the Listing Studio revision banner. Owner edits and
      // resubmits — flow loops back through pending_review.
      const reasonKey = SEND_BACK_REASONS[review_reason] ? review_reason : 'other';
      const reasonLabel = SEND_BACK_REASONS[reasonKey];
      const note = (review_note || '').trim();
      // Force a note when reason is "other" so the owner has actionable info.
      if (reasonKey === 'other' && !note) {
        return NextResponse.json({ error: 'A note is required when reason is "other"' }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await supabase
        .from('listings')
        .update({
          status: 'draft',
          is_active: false,
          admin_reviewed_at: reviewedAt,
          admin_reviewed_by: adminId,
          admin_review_reason: reasonKey,
          admin_review_note: note || null,
        })
        .eq('id', id)
        .select(LISTING_COLUMNS)
        .single();

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

      await writeAuditLogBatch([{
        tableName: 'listings', rowId: id, action: 'send_back',
        fieldChanged: 'status', oldValue: 'pending_review', newValue: 'draft',
        adminUser: adminId,
        metadata: { review_reason: reasonKey, review_note: note },
      }]);

      if (ownerEmail) {
        sendTemplateEmail('listing_revision_requested', ownerEmail, {
          owner_name: ownerName,
          listing_address: fullAddress,
          review_reason: reasonLabel,
          review_note: note || '(no additional note)',
        }).catch(() => {});
      }

      return NextResponse.json(updated);
    }

    // Reject: terminal. Use Suppress instead for hard-block in most cases.
    const { data: updated, error: updateErr } = await supabase
      .from('listings')
      .update({
        status: 'rejected',
        is_active: false,
        admin_reviewed_at: reviewedAt,
        admin_reviewed_by: adminId,
      })
      .eq('id', id)
      .select(LISTING_COLUMNS)
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await writeAuditLogBatch([{
      tableName: 'listings', rowId: id, action: 'reject',
      fieldChanged: 'status', oldValue: 'pending_review', newValue: 'rejected',
      adminUser: adminId,
      metadata: { rejection_reason },
    }]);

    if (ownerEmail) {
      sendTemplateEmail('listing_rejected', ownerEmail, {
        owner_name: ownerName,
        listing_address: fullAddress,
        rejection_reason: rejection_reason || 'Your listing did not meet our content guidelines. Please review and resubmit.',
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids[] is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Snapshot rows before soft-delete for audit
    const { data: rows, error: fetchErr } = await supabase
      .from('listings')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Soft-delete: set is_active=false, status=archived
    const { error: updateErr } = await supabase
      .from('listings')
      .update({ is_active: false, status: 'archived' })
      .in('id', ids);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log each deletion with snapshot
    const auditEntries = rows.map(row => ({
      tableName: 'listings',
      rowId: row.id,
      action: 'delete',
      oldValue: JSON.stringify(row),
      metadata: { snapshot: row },
    }));
    await writeAuditLogBatch(auditEntries);

    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
