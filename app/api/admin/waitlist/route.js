import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLog, writeAuditLogBatch } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, role, notes } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('waitlist')
      .insert({ email, role, notes: notes || null })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog({
      tableName: 'waitlist',
      rowId: data.id,
      action: 'create',
      newValue: JSON.stringify({ email, role, notes }),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
      .from('waitlist')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Apply update
    const { data: updatedRows, error: updateErr } = await supabase
      .from('waitlist')
      .update(changes)
      .in('id', ids)
      .select();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Write audit logs for each changed field on each row
    const auditEntries = [];
    for (const oldRow of oldRows) {
      for (const [field, newVal] of Object.entries(changes)) {
        const oldVal = oldRow[field];
        if (String(oldVal) !== String(newVal)) {
          auditEntries.push({
            tableName: 'waitlist',
            rowId: oldRow.id,
            action: field === 'suppressed' ? (newVal ? 'suppress' : 'unsuppress') : 'update',
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
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids[] is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Snapshot rows before deletion for audit
    const { data: rows, error: fetchErr } = await supabase
      .from('waitlist')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const { error: deleteErr } = await supabase
      .from('waitlist')
      .delete()
      .in('id', ids);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Audit log each deletion with snapshot
    const auditEntries = rows.map(row => ({
      tableName: 'waitlist',
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
