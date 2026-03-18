import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { createServiceClient } from '../../../../lib/supabase';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

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
      revenue: { proSubscribers, premiumSubscribers, mrr: 0 },
      funnel: {
        ownersRegistered: owners,
        listingsCreated: ownerCreated,
        listingsActive: active,
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
