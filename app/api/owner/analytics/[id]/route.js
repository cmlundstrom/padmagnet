import { getAuthUser } from '../../../../../lib/auth-helpers';
import { createServiceClient } from '../../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { user, error: authError, status } = await getAuthUser(request);
  if (authError) return NextResponse.json({ error: authError }, { status });

  const { id } = await params;
  const supabase = createServiceClient();

  // Verify ownership
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('id, owner_user_id, source, city, county, street_number, street_name, created_at, status')
    .eq('id', id)
    .single();

  if (listingErr || !listing || listing.owner_user_id !== user.id || listing.source !== 'owner') {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }

  // Run all queries in parallel
  const [viewsResult, swipesResult, convosResult] = await Promise.all([
    supabase.from('listing_views').select('id', { count: 'exact', head: true }).eq('listing_id', id),
    supabase.from('swipes').select('direction').eq('listing_id', id),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('listing_id', id),
  ]);

  const uniqueViews = viewsResult.count || 0;
  const swipes = swipesResult.data || [];
  const rightSwipes = swipes.filter(s => s.direction === 'right').length;
  const leftSwipes = swipes.filter(s => s.direction === 'left').length;
  const totalSwipes = rightSwipes + leftSwipes;
  const saveRate = totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 1000) / 10 : 0;
  const conversations = convosResult.count || 0;
  const daysOnMarket = listing.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000))
    : 0;

  return NextResponse.json({
    listing_id: id,
    address: [listing.street_number, listing.street_name].filter(Boolean).join(' '),
    city: listing.city,
    county: listing.county,
    status: listing.status,
    days_on_market: daysOnMarket,
    unique_views: uniqueViews,
    right_swipes: rightSwipes,
    left_swipes: leftSwipes,
    save_rate: saveRate,
    conversations,
  });
}
