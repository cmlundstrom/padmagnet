import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { checkRateLimit } from '../../../lib/rate-limit';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listing_id');
    const direction = searchParams.get('direction'); // 'left', 'right', or null for all
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    // Single listing lookup — lightweight check for save state
    if (listingId) {
      const { data, error } = await supabase
        .from('swipes')
        .select('direction')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data || { direction: null });
    }

    let query = supabase
      .from('swipes')
      .select(`
        *,
        listing:listings(*)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (direction) {
      query = query.eq('direction', direction);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Batch fetch owner tiers for badge display on saved listings
    const listings = (data || []).map(s => s.listing).filter(Boolean);
    const ownerIds = [...new Set(listings.filter(l => l.source === 'owner' && l.owner_user_id).map(l => l.owner_user_id))];
    let tierMap = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, tier')
        .in('id', ownerIds);
      tierMap = Object.fromEntries((profiles || []).map(p => [p.id, p.tier]));
    }
    const enriched = (data || []).map(s => ({
      ...s,
      listing: s.listing ? {
        ...s.listing,
        owner_tier: s.listing.source === 'owner' ? (tierMap[s.listing.owner_user_id] || 'free') : null,
      } : null,
    }));

    return NextResponse.json({
      swipes: enriched,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json();
    const { listing_id } = body;

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('swipes')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listing_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json();
    const { listing_id, direction } = body;

    if (!listing_id || !direction) {
      return NextResponse.json({ error: 'listing_id and direction are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('swipes')
      .update({ direction })
      .eq('user_id', user.id)
      .eq('listing_id', listing_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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

    const rl = await checkRateLimit('swipes', user.id);
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429, headers: rl.headers });
    }

    const body = await request.json();
    const { listing_id, direction, padscore } = body;

    if (!listing_id || !direction) {
      return NextResponse.json({ error: 'listing_id and direction are required' }, { status: 400 });
    }

    if (!['left', 'right', 'reset'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be "left", "right", or "reset"' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('swipes')
      .upsert(
        { user_id: user.id, listing_id, direction, padscore },
        { onConflict: 'user_id,listing_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
