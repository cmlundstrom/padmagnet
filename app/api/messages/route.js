import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify user is a participant
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('id, tenant_user_id, owner_user_id')
      .eq('id', conversationId)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (convo.tenant_user_id !== user.id && convo.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark unread messages from the other person as read
    const unreadIds = (messages || [])
      .filter(m => m.sender_id !== user.id && !m.read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadIds);

      // Reset unread count for this user
      const unreadField = convo.tenant_user_id === user.id ? 'tenant_unread_count' : 'owner_unread_count';
      await supabase
        .from('conversations')
        .update({ [unreadField]: 0 })
        .eq('id', conversationId);
    }

    return NextResponse.json(messages || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json();
    const { conversation_id, body: messageBody } = body;

    if (!conversation_id || !messageBody) {
      return NextResponse.json({ error: 'conversation_id and body are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify user is a participant
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('id, tenant_user_id, owner_user_id')
      .eq('id', conversation_id)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (convo.tenant_user_id !== user.id && convo.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        body: messageBody,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update conversation denormalized fields
    const otherUnreadField = convo.tenant_user_id === user.id ? 'owner_unread_count' : 'tenant_unread_count';

    // Fetch current unread count to increment
    const { data: currentConvo } = await supabase
      .from('conversations')
      .select(otherUnreadField)
      .eq('id', conversation_id)
      .single();

    const currentCount = currentConvo?.[otherUnreadField] || 0;

    await supabase
      .from('conversations')
      .update({
        last_message_text: messageBody,
        last_message_at: new Date().toISOString(),
        [otherUnreadField]: currentCount + 1,
      })
      .eq('id', conversation_id);

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
