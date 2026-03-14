import { createServiceClient } from '../../../../../lib/supabase';
import { getAuthUser } from '../../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id: conversationId } = await params;
    const supabase = createServiceClient();

    // Look up conversation and verify participant
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('id, tenant_user_id, owner_user_id')
      .eq('id', conversationId)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Determine caller's role
    let role;
    if (convo.tenant_user_id === user.id) {
      role = 'tenant';
    } else if (convo.owner_user_id === user.id) {
      role = 'owner';
    } else {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Call RPC — updates cursor, zeroes unread count, stamps messages.read_at
    const { error: rpcErr } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
      p_role: role,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, read_at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
