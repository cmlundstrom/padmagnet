import { createServiceClient } from '../../../../../lib/supabase';
import { writeAuditLog } from '../../../../../lib/api-helpers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/tickets/messages?ticket_id=xxx — get messages for a ticket
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/tickets/messages — add a reply to a ticket
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ticket_id, body: messageBody, channel, sender_name } = body;

    if (!ticket_id || !messageBody?.trim()) {
      return NextResponse.json({ error: 'ticket_id and body are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Insert message
    const { data: message, error: msgErr } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id,
        direction: 'outbound',
        sender_type: 'agent',
        sender_name: sender_name || 'Admin',
        body: messageBody.trim(),
        channel: channel || 'web',
        delivery_status: 'delivered',
      })
      .select()
      .single();

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // Touch ticket updated_at
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticket_id);

    await writeAuditLog({
      tableName: 'tickets',
      rowId: ticket_id,
      action: 'reply',
      newValue: messageBody.trim().slice(0, 200),
      metadata: { message_id: message.id, channel: channel || 'web' },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
