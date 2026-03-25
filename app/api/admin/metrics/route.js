import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { createServiceClient } from '../../../../lib/supabase';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceClient();
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    const [
      ownerRes,
      tenantRes,
      activeRes,
      draftRes,
      ownerListingsRes,
      recentSwipesRes,
      rightSwipesRes,
      recentMessagesRes,
      conversationsRes,
      proRes,
      premiumRes,
      // Tenant funnel
      tenantsWithPrefsRes,
      tenantsWithSwipeRes,
      tenantsWithConvoRes,
      tenantsWithMsgRes,
      // Revenue
      revenueTodayRes,
      revenueWeekRes,
      revenueMonthRes,
      revenueTotalRes,
      // Expiry forecast
      expiring7dRes,
      expiring3dRes,
      expiring1dRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'tenant'),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('is_active', true),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('source', 'owner'),
      supabase.from('swipes').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('swipes').select('id', { count: 'exact', head: true }).eq('direction', 'right').gte('created_at', sevenDaysAgo),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tier', 'pro'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tier', 'premium'),
      // Tenant funnel: tenants who set preferences
      supabase.from('tenant_preferences').select('user_id', { count: 'exact', head: true }),
      // Tenants who swiped at least once (distinct user_ids)
      supabase.from('swipes').select('user_id'),
      // Tenants who started a conversation (distinct tenant_user_ids)
      supabase.from('conversations').select('tenant_user_id'),
      // Tenants who sent a message (distinct sender_ids)
      supabase.from('messages').select('sender_id'),
      // Revenue: payments with status=succeeded
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded').gte('created_at', todayStart),
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded').gte('created_at', weekStart),
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded').gte('created_at', monthStart),
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded'),
      // Expiry forecast
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('source', 'owner').eq('status', 'active').lte('expires_at', new Date(Date.now() + 7 * 86400000).toISOString()).gte('expires_at', now.toISOString()),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('source', 'owner').eq('status', 'active').lte('expires_at', new Date(Date.now() + 3 * 86400000).toISOString()).gte('expires_at', now.toISOString()),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('source', 'owner').eq('status', 'active').lte('expires_at', new Date(Date.now() + 1 * 86400000).toISOString()).gte('expires_at', now.toISOString()),
    ]);

    const owners = ownerRes.count || 0;
    const tenants = tenantRes.count || 0;
    const active = activeRes.count || 0;
    const draft = draftRes.count || 0;
    const ownerCreated = ownerListingsRes.count || 0;
    const swipes7d = recentSwipesRes.count || 0;
    const rightSwipes7d = rightSwipesRes.count || 0;
    const messages7d = recentMessagesRes.count || 0;
    const totalConversations = conversationsRes.count || 0;
    const proSubscribers = proRes.count || 0;
    const premiumSubscribers = premiumRes.count || 0;

    const rightSwipeRate = swipes7d > 0
      ? Math.round((rightSwipes7d / swipes7d) * 100)
      : 0;

    // Sum revenue from payments
    const sumPayments = (res) => (res.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    const data = {
      users: { owners, tenants, total: owners + tenants },
      listings: { active, draft, ownerCreated },
      engagement: {
        swipes7d,
        rightSwipes7d,
        rightSwipeRate,
        messages7d,
        totalConversations,
      },
      revenue: {
        proSubscribers,
        premiumSubscribers,
        today: sumPayments(revenueTodayRes),
        week: sumPayments(revenueWeekRes),
        month: sumPayments(revenueMonthRes),
        total: sumPayments(revenueTotalRes),
      },
      funnel: {
        ownersRegistered: owners,
        listingsCreated: ownerCreated,
        listingsActive: active,
      },
      tenantFunnel: {
        registered: tenants,
        preferencesSet: tenantsWithPrefsRes.count || 0,
        swiped: new Set((tenantsWithSwipeRes.data || []).map(r => r.user_id)).size,
        conversationStarted: new Set((tenantsWithConvoRes.data || []).map(r => r.tenant_user_id)).size,
        messageSent: new Set((tenantsWithMsgRes.data || []).map(r => r.sender_id)).size,
      },
      expiryForecast: {
        next7d: expiring7dRes.count || 0,
        next3d: expiring3dRes.count || 0,
        next1d: expiring1dRes.count || 0,
      },
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-cache' },
    });
  } catch (err) {
    console.error('[admin/metrics] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
