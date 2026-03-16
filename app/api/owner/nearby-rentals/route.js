import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_RADII = [1, 3, 5];
const MAX_LIMIT = 50;

/**
 * Check if owner has access to Nearby Rentals feature.
 * Priority: active_listing → free_trial → standalone_purchase → denied
 */
async function checkAccess(supabase, userId) {
  // 1. Any active listing? (expires_at enforced after Stripe integration)
  const { data: activeListing } = await supabase
    .from('listings')
    .select('id, expires_at')
    .eq('owner_user_id', userId)
    .eq('source', 'owner')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (activeListing) {
    return { granted: true, reason: 'active_listing', expires_at: activeListing.expires_at };
  }

  // 2. Free 30-day trial (from first listing payment)?
  const { data: firstPurchase } = await supabase
    .from('owner_purchases')
    .select('created_at')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstPurchase) {
    const trialEnd = new Date(firstPurchase.created_at);
    trialEnd.setDate(trialEnd.getDate() + 30);
    if (new Date() < trialEnd) {
      return { granted: true, reason: 'free_trial', expires_at: trialEnd.toISOString() };
    }
  }

  // 3. Standalone purchase of Nearby Rentals Access?
  const { data: standalone } = await supabase
    .from('owner_purchases')
    .select('created_at, products!inner(feature_key, metadata)')
    .eq('owner_user_id', userId)
    .eq('products.feature_key', 'nearby_rentals')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (standalone) {
    const duration = standalone.products?.metadata?.duration_days || 30;
    const expiresAt = new Date(standalone.created_at);
    expiresAt.setDate(expiresAt.getDate() + duration);
    if (new Date() < expiresAt) {
      return { granted: true, reason: 'standalone_purchase', expires_at: expiresAt.toISOString() };
    }
  }

  return { granted: false, reason: 'none', expires_at: null };
}

// GET /api/owner/nearby-rentals?listing_id=...&radius=3&beds=3&baths=2&page=1&limit=20
// OR  /api/owner/nearby-rentals?lat=26.1&lng=-80.2&radius=3&beds=3&baths=2&page=1&limit=20
export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listing_id');
    const queryLat = searchParams.get('lat');
    const queryLng = searchParams.get('lng');
    const radius = Math.min(Math.max(parseInt(searchParams.get('radius')) || 3, 1), 5);
    const beds = searchParams.get('beds') ? parseInt(searchParams.get('beds')) : null;
    const baths = searchParams.get('baths') ? parseInt(searchParams.get('baths')) : null;
    const minSqft = searchParams.get('min_sqft') ? parseInt(searchParams.get('min_sqft')) : null;
    const maxSqft = searchParams.get('max_sqft') ? parseInt(searchParams.get('max_sqft')) : null;
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 20, 1), MAX_LIMIT);

    if (!listingId && (!queryLat || !queryLng)) {
      return NextResponse.json({ error: 'Either listing_id or lat/lng are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    let subjectInfo;
    let access;
    let excludeId = listingId || null;

    if (!listingId && queryLat && queryLng) {
      // --- Coordinate mode: direct lat/lng search ---
      const parsedLat = parseFloat(queryLat);
      const parsedLng = parseFloat(queryLng);

      if (isNaN(parsedLat) || isNaN(parsedLng) ||
          parsedLat < 24 || parsedLat > 31 ||
          parsedLng < -88 || parsedLng > -79) {
        return NextResponse.json({ error: 'Invalid coordinates. Must be within Florida bounds (lat 24-31, lng -88 to -79).' }, { status: 400 });
      }

      subjectInfo = {
        latitude: parsedLat,
        longitude: parsedLng,
        beds: null,
        baths: null,
        sqft: null,
        list_price: null,
        address: null,
        street_number: null,
        street_name: null,
        city: null,
        photos: [],
        days_on_market: null,
      };
      access = { granted: true, reason: 'location_search', expires_at: null };
      excludeId = null;
    } else {
      // --- Listing mode: existing ownership-checked flow ---
      const { data: subject, error: subjectErr } = await supabase
        .from('listings')
        .select('id, latitude, longitude, bedrooms_total, bathrooms_total, living_area, list_price, street_number, street_name, city, photos, created_at')
        .eq('id', listingId)
        .eq('owner_user_id', user.id)
        .eq('source', 'owner')
        .single();

      if (subjectErr || !subject) {
        return NextResponse.json({ error: 'Listing not found or not authorized' }, { status: 404 });
      }

      if (!subject.latitude || !subject.longitude) {
        return NextResponse.json({ error: 'Subject property has no coordinates. Update the address first.' }, { status: 400 });
      }

      access = await checkAccess(supabase, user.id);

      subjectInfo = {
        latitude: subject.latitude,
        longitude: subject.longitude,
        beds: subject.bedrooms_total,
        baths: subject.bathrooms_total,
        sqft: subject.living_area,
        list_price: subject.list_price,
        address: [subject.street_number, subject.street_name, subject.city].filter(Boolean).join(', '),
        street_number: subject.street_number,
        street_name: subject.street_name,
        city: subject.city,
        photos: subject.photos,
        days_on_market: subject.created_at ? Math.max(0, Math.floor((Date.now() - new Date(subject.created_at).getTime()) / (1000 * 60 * 60 * 24))) : null,
      };
    }

    // If no access, return subject + access info but no listings
    if (!access.granted) {
      return NextResponse.json({
        listings: [],
        subject: subjectInfo,
        access,
        radius_miles: radius,
        page: 1,
        limit,
        hasMore: false,
      }, {
        headers: { 'Cache-Control': 'private, no-cache' },
      });
    }

    // Haversine radius query with bounding-box pre-filter
    const lat = subjectInfo.latitude;
    const lng = subjectInfo.longitude;
    const latDelta = radius / 69.0;
    const lngDelta = radius / (69.0 * Math.cos(lat * Math.PI / 180));
    const offset = (page - 1) * limit;

    // Build the query using Supabase RPC for the Haversine calculation
    const { data: listings, error: queryErr } = await supabase.rpc('nearby_rentals_search', {
      subject_lat: lat,
      subject_lng: lng,
      radius_miles: radius,
      min_lat: lat - latDelta,
      max_lat: lat + latDelta,
      min_lng: lng - lngDelta,
      max_lng: lng + lngDelta,
      filter_beds: beds,
      filter_baths: baths,
      filter_min_sqft: minSqft,
      filter_max_sqft: maxSqft,
      exclude_id: excludeId,
      result_limit: limit + 1, // fetch one extra to check hasMore
      result_offset: offset,
    });

    if (queryErr) {
      console.error('Nearby rentals query error:', queryErr);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const hasMore = (listings || []).length > limit;
    const trimmed = (listings || []).slice(0, limit);

    return NextResponse.json({
      listings: trimmed,
      subject: subjectInfo,
      access,
      radius_miles: radius,
      page,
      limit,
      hasMore,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('Nearby rentals error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
