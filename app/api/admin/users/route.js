import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLog, writeAuditLogBatch } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/users — list all profiles (or single by ?id=)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const supabase = createServiceClient();

    if (id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/users — update profile fields
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { ids, changes } = body;

    if (!ids?.length || !changes) {
      return NextResponse.json({ error: 'ids[] and changes are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch current rows for audit diff
    const { data: oldRows, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Apply update
    const { data: updatedRows, error: updateErr } = await supabase
      .from('profiles')
      .update(changes)
      .in('id', ids)
      .select();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Write audit logs for each changed field
    const auditEntries = [];
    for (const oldRow of oldRows) {
      for (const [field, newVal] of Object.entries(changes)) {
        const oldVal = oldRow[field];
        if (String(oldVal) !== String(newVal)) {
          auditEntries.push({
            tableName: 'profiles',
            rowId: oldRow.id,
            action: 'update',
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

// DELETE /api/admin/users — delete profile (use with caution)
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids[] is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Snapshot before deletion
    const { data: rows, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const { error: deleteErr } = await supabase
      .from('profiles')
      .delete()
      .in('id', ids);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    const auditEntries = rows.map(row => ({
      tableName: 'profiles',
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
