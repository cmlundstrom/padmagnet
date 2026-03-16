import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLog, writeAuditLogBatch } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const LISTING_COLUMNS = 'id, listing_key, listing_id, street_number, street_name, city, state_or_province, postal_code, property_type, property_sub_type, list_price, bedrooms_total, bathrooms_total, living_area, pets_allowed, fenced_yard, source, owner_user_id, status, is_active, is_boosted, view_count, inquiry_count, photos, created_at, updated_at';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
