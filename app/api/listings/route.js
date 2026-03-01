import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { calculatePadScore } from '../../../lib/padscore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const beds = searchParams.get('beds');
    const baths = searchParams.get('baths');
    const propertyType = searchParams.get('propertyType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    // Fetch user preferences for PadScore
    const { data: prefs } = await supabase
      .from('tenant_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch already-swiped listing IDs
    const { data: swipedRows } = await supabase
      .from('swipes')
      .select('listing_id')
      .eq('user_id', user.id);
    const swipedIds = (swipedRows || []).map(s => s.listing_id);

    // Build query
    let query = supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (city) query = query.eq('city', city);
    if (minPrice) query = query.gte('list_price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('list_price', parseFloat(maxPrice));
    if (beds) query = query.gte('bedrooms_total', parseInt(beds, 10));
    if (baths) query = query.gte('bathrooms_total', parseInt(baths, 10));
    if (propertyType) query = query.eq('property_sub_type', propertyType);

    // Exclude already-swiped listings
    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: listings, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate PadScore for each listing and sort by score
    const scored = (listings || []).map(listing => {
      const padScore = calculatePadScore(prefs, listing);
      return { ...listing, padScore };
    });

    scored.sort((a, b) => b.padScore.score - a.padScore.score);

    // Paginate after scoring
    const paginated = scored.slice(offset, offset + limit);

    return NextResponse.json({
      listings: paginated,
      total: count || scored.length,
      page,
      limit,
      hasMore: offset + limit < scored.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
