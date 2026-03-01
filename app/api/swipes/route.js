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
    const direction = searchParams.get('direction'); // 'left', 'right', or null for all
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

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

    return NextResponse.json({
      swipes: data || [],
      total: count || 0,
      page,
      limit,
    });
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
    const { listing_id, direction, padscore } = body;

    if (!listing_id || !direction) {
      return NextResponse.json({ error: 'listing_id and direction are required' }, { status: 400 });
    }

    if (!['left', 'right'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be "left" or "right"' }, { status: 400 });
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
