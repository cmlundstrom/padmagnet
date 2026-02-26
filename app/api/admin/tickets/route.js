import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLog, writeAuditLogBatch } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/tickets — list all tickets (with optional ?status= filter)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    const supabase = createServiceClient();

    // Single ticket with messages
    if (id) {
      const { data: ticket, error: ticketErr } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticketErr) {
        return NextResponse.json({ error: ticketErr.message }, { status: 500 });
      }

      const { data: messages, error: msgErr } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (msgErr) {
        return NextResponse.json({ error: msgErr.message }, { status: 500 });
      }

      return NextResponse.json({ ticket, messages });
    }

    // List all tickets
    let query = supabase
      .from('tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/tickets — create a new ticket (+ optional first message)
export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, channel, category, priority, contact_email, contact_name, contact_phone, body: messageBody, tags, notes } = body;

    if (!subject) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Insert ticket
    const ticketData = {
      subject,
      channel: channel || 'web',
      category: category || 'general',
      priority: priority || 'normal',
      contact_email: contact_email || null,
      contact_name: contact_name || null,
      contact_phone: contact_phone || null,
      tags: tags || [],
      notes: notes || null,
    };

    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single();

    if (ticketErr) {
      return NextResponse.json({ error: ticketErr.message }, { status: 500 });
    }

    // Insert initial message if body provided
    if (messageBody && messageBody.trim()) {
      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          direction: 'inbound',
          sender_type: 'customer',
          sender_name: contact_name || contact_email || 'Unknown',
          body: messageBody.trim(),
          channel: channel || 'web',
        });
    }

    await writeAuditLog({
      tableName: 'tickets',
      rowId: ticket.id,
      action: 'create',
      newValue: JSON.stringify({ subject, channel, category, priority, contact_email }),
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/tickets — update ticket fields
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
      .from('tickets')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Auto-set resolved_at / closed_at timestamps
    const updatedChanges = { ...changes };
    if (changes.status === 'resolved' && !changes.resolved_at) {
      updatedChanges.resolved_at = new Date().toISOString();
    }
    if (changes.status === 'closed' && !changes.closed_at) {
      updatedChanges.closed_at = new Date().toISOString();
    }

    // Apply update
    const { data: updatedRows, error: updateErr } = await supabase
      .from('tickets')
      .update(updatedChanges)
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
            tableName: 'tickets',
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

// DELETE /api/admin/tickets — delete tickets
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
      .from('tickets')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Messages cascade-delete via FK
    const { error: deleteErr } = await supabase
      .from('tickets')
      .delete()
      .in('id', ids);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Audit log each deletion with snapshot
    const auditEntries = rows.map(row => ({
      tableName: 'tickets',
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
