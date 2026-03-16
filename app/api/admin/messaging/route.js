import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/messaging — messaging stats + conversations with filters
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const sort = searchParams.get('sort') || 'newest'; // newest | oldest | unread
    const type = searchParams.get('type') || ''; // internal_owner | external_agent
    const status = searchParams.get('status') || ''; // active | archived | blocked
    const search = searchParams.get('search') || '';
    const conversationId = searchParams.get('conversation_id') || '';

    // If requesting a single conversation's messages
    if (conversationId) {
      return await getConversationDetail(supabase, conversationId);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Stats queries
    const [
      totalConvosRes,
      activeConvosRes,
      totalMessagesRes,
      messagesTodayRes,
      messagesWeekRes,
      pendingQueueRes,
      failedQueueRes,
    ] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('last_message_at', weekAgo),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('message_delivery_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('message_delivery_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);

    // Build conversation query with filters
    let query = supabase
      .from('conversations')
      .select('id, listing_id, listing_address, listing_photo_url, conversation_type, status, tenant_user_id, owner_user_id, external_agent_name, external_agent_email, external_agent_phone, last_message_text, last_message_at, tenant_unread_count, owner_unread_count, created_at', { count: 'exact' });

    if (type) query = query.eq('conversation_type', type);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('listing_address', `%${search}%`);

    // Sort
    if (sort === 'oldest') {
      query = query.order('last_message_at', { ascending: true, nullsFirst: false });
    } else if (sort === 'unread') {
      // Sort by total unread (tenant + owner) desc, then newest
      query = query.order('tenant_unread_count', { ascending: false }).order('owner_unread_count', { ascending: false }).order('last_message_at', { ascending: false });
    } else {
      query = query.order('last_message_at', { ascending: false, nullsFirst: false });
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: conversations, count: totalFiltered, error: convErr } = await query;
    if (convErr) throw convErr;

    // Fetch participant display names for all conversations
    const userIds = new Set();
    (conversations || []).forEach(c => {
      if (c.tenant_user_id) userIds.add(c.tenant_user_id);
      if (c.owner_user_id) userIds.add(c.owner_user_id);
    });

    let profileMap = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, role')
        .in('id', [...userIds]);
      if (profiles) {
        profiles.forEach(p => { profileMap[p.id] = p; });
      }
    }

    // Enrich conversations with participant names
    const enriched = (conversations || []).map(c => ({
      ...c,
      tenant_name: profileMap[c.tenant_user_id]?.display_name || profileMap[c.tenant_user_id]?.email || '—',
      owner_name: c.conversation_type === 'external_agent'
        ? c.external_agent_name || '—'
        : (profileMap[c.owner_user_id]?.display_name || profileMap[c.owner_user_id]?.email || '—'),
    }));

    return NextResponse.json({
      totalConversations: totalConvosRes.count || 0,
      activeConversations: activeConvosRes.count || 0,
      totalMessages: totalMessagesRes.count || 0,
      messagesToday: messagesTodayRes.count || 0,
      messagesThisWeek: messagesWeekRes.count || 0,
      pendingDeliveryQueue: pendingQueueRes.count || 0,
      failedDeliveryQueue: failedQueueRes.count || 0,
      conversations: enriched,
      totalFiltered: totalFiltered || 0,
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Get full message thread for a conversation
async function getConversationDetail(supabase, conversationId) {
  const [convoRes, messagesRes, deliveriesRes] = await Promise.all([
    supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single(),
    supabase
      .from('messages')
      .select('id, sender_id, body, read, created_at, external_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
    supabase
      .from('message_delivery_queue')
      .select('message_id, channel, status, attempts, last_error, created_at')
      .in('message_id', []) // placeholder, will be filled after messages load
  ]);

  if (convoRes.error) throw convoRes.error;

  const messages = messagesRes.data || [];
  const messageIds = messages.map(m => m.id);

  // Fetch delivery records for these messages
  let deliveries = [];
  if (messageIds.length > 0) {
    const { data: delivData } = await supabase
      .from('message_delivery_queue')
      .select('message_id, channel, status, attempts, last_error, created_at')
      .in('message_id', messageIds);
    deliveries = delivData || [];
  }

  // Group deliveries by message_id
  const deliveryMap = {};
  deliveries.forEach(d => {
    if (!deliveryMap[d.message_id]) deliveryMap[d.message_id] = [];
    deliveryMap[d.message_id].push(d);
  });

  // Get sender profiles
  const senderIds = [...new Set(messages.filter(m => m.sender_id).map(m => m.sender_id))];
  let senderMap = {};
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email, role')
      .in('id', senderIds);
    if (profiles) {
      profiles.forEach(p => { senderMap[p.id] = p; });
    }
  }

  const convo = convoRes.data;
  const enrichedMessages = messages.map(m => ({
    ...m,
    sender_name: m.sender_id
      ? (senderMap[m.sender_id]?.display_name || senderMap[m.sender_id]?.email || 'Unknown')
      : (convo.external_agent_name || 'External Agent'),
    sender_role: m.sender_id
      ? (senderMap[m.sender_id]?.role || 'unknown')
      : 'external',
    deliveries: deliveryMap[m.id] || [],
  }));

  return NextResponse.json({
    conversation: {
      ...convo,
      tenant_name: senderMap[convo.tenant_user_id]?.display_name || senderMap[convo.tenant_user_id]?.email || '—',
      owner_name: convo.conversation_type === 'external_agent'
        ? convo.external_agent_name || '—'
        : (senderMap[convo.owner_user_id]?.display_name || senderMap[convo.owner_user_id]?.email || '—'),
    },
    messages: enrichedMessages,
  });
}

// PATCH /api/admin/messaging — update conversation status or delete
export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    if (!['active', 'archived', 'blocked'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/messaging — delete a conversation and its messages
export async function DELETE(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Delete delivery queue entries for this conversation's messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', id);

    if (msgs && msgs.length > 0) {
      await supabase
        .from('message_delivery_queue')
        .delete()
        .in('message_id', msgs.map(m => m.id));
    }

    // Messages cascade-delete with conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
