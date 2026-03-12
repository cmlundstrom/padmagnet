import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { calculatePadScore } from '../../../lib/padscore';
import { matchesCoreFields } from '../../../lib/core-match';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Compute a lat/lng bounding box that encompasses all search zones.
 * Each zone is expanded by its radius × buffer multiplier.
 * 1 degree latitude ≈ 69 miles; 1 degree longitude ≈ 69 × cos(lat) miles.
 */
function computeGeoBounds(zones, bufferMultiplier = 1.5) {
  if (!zones || zones.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const zone of zones) {
    const lat = parseFloat(zone.center_lat);
    const lng = parseFloat(zone.center_lng);
    const radiusMi = parseFloat(zone.radius_miles) * bufferMultiplier;
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMi)) continue;

    const latDelta = radiusMi / 69;
    const lngDelta = radiusMi / (69 * Math.cos(lat * Math.PI / 180));

    minLat = Math.min(minLat, lat - latDelta);
    maxLat = Math.max(maxLat, lat + latDelta);
    minLng = Math.min(minLng, lng - lngDelta);
    maxLng = Math.max(maxLng, lng + lngDelta);
  }

  if (!isFinite(minLat)) return null;
  return { minLat, maxLat, minLng, maxLng };
}

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

    // Fetch search zones for multi-zone location scoring
    const { data: zones } = await supabase
      .from('tenant_search_zones')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    // Fetch already-swiped listing IDs (only exclude left/right, not reset)
    const { data: swipedRows } = await supabase
      .from('swipes')
      .select('listing_id, direction')
      .eq('user_id', user.id);
    const swipedIds = (swipedRows || [])
      .filter(s => s.direction === 'left' || s.direction === 'right')
      .map(s => s.listing_id);
    const resetIds = new Set((swipedRows || [])
      .filter(s => s.direction === 'reset')
      .map(s => s.listing_id));

    // Fetch core match field configs (for boost eligibility)
    const { data: coreFields } = await supabase
      .from('listing_field_configs')
      .select('field_key')
      .eq('is_core_match_field', true);

    // Get boosted listing + position from DB (fairness hash in SQL)
    const { data: boostedId } = await supabase.rpc('select_boosted_listing', { p_tenant_id: user.id });
    const { data: boostPos } = await supabase.rpc('get_boost_position', { p_tenant_id: user.id });

    // Build query — use tenant_active_listings view
    let query = supabase
      .from('tenant_active_listings')
      .select('*', { count: 'exact' });

    if (city) query = query.eq('city', city);
    if (minPrice) query = query.gte('list_price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('list_price', parseFloat(maxPrice));
    if (beds) query = query.gte('bedrooms_total', parseInt(beds, 10));
    if (baths) query = query.gte('bathrooms_total', parseInt(baths, 10));
    if (propertyType) query = query.eq('property_sub_type', propertyType);

    // Geo-fence: only return listings within bounding box of tenant's search zones
    const bounds = computeGeoBounds(zones);
    if (bounds) {
      query = query
        .gte('latitude', bounds.minLat)
        .lte('latitude', bounds.maxLat)
        .gte('longitude', bounds.minLng)
        .lte('longitude', bounds.maxLng);
    }

    // Exclude already-swiped listings
    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: listings, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate PadScore for each listing, flag reseen, sort by score
    const scored = (listings || []).map(listing => {
      const padScore = calculatePadScore(prefs, listing, zones || []);
      const _reseen = resetIds.has(listing.id);
      return { ...listing, padScore, _reseen };
    });

    // Fresh listings first (by score), reseen listings last (by score)
    scored.sort((a, b) => {
      if (a._reseen !== b._reseen) return a._reseen ? 1 : -1;
      return b.padScore.score - a.padScore.score;
    });

    // Inject boosted listing at deterministic position if it passes core-match
    let result = scored;
    if (boostedId) {
      const boosted = scored.find(l => l.id === boostedId);
      if (boosted && matchesCoreFields(boosted, prefs, coreFields || [])) {
        const regular = scored.filter(l => l.id !== boostedId);
        const pos = Math.min(boostPos ?? 0, regular.length);
        regular.splice(pos, 0, { ...boosted, _boosted: true });
        result = regular;
      }
    }

    // Paginate after scoring + boost injection
    const paginated = result.slice(offset, offset + limit);

    return NextResponse.json({
      listings: paginated,
      total: count || result.length,
      page,
      limit,
      hasMore: offset + limit < result.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
