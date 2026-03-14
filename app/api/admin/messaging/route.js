import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/messaging — messaging stats + recent conversations
export async function GET() {
  try {
    const supabase = createServiceClient();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalConvosRes,
      activeConvosRes,
      totalMessagesRes,
      messagesTodayRes,
      messagesWeekRes,
      pendingQueueRes,
      failedQueueRes,
      recentConvosRes,
    ] = await Promise.all([
      // Total conversations
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true }),

      // Active conversations (message in last 7 days)
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('last_message_at', weekAgo),

      // Total messages
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true }),

      // Messages today
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),

      // Messages this week
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo),

      // Pending delivery queue items
      supabase
        .from('message_delivery_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Failed delivery queue items
      supabase
        .from('message_delivery_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),

      // Recent 20 conversations
      supabase
        .from('conversations')
        .select('listing_address, conversation_type, tenant_user_id, owner_user_id, last_message_text, last_message_at, tenant_unread_count, owner_unread_count')
        .order('last_message_at', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      totalConversations: totalConvosRes.count || 0,
      activeConversations: activeConvosRes.count || 0,
      totalMessages: totalMessagesRes.count || 0,
      messagesToday: messagesTodayRes.count || 0,
      messagesThisWeek: messagesWeekRes.count || 0,
      pendingDeliveryQueue: pendingQueueRes.count || 0,
      failedDeliveryQueue: failedQueueRes.count || 0,
      recentConversations: recentConvosRes.data || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
