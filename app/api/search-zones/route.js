import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

const MAX_ZONES = 3;

export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('tenant_search_zones')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { label, center_lat, center_lng, radius_miles } = await request.json();

    if (!label || center_lat == null || center_lng == null) {
      return NextResponse.json({ error: 'label, center_lat, and center_lng are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check current zone count
    const { count } = await supabase
      .from('tenant_search_zones')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count >= MAX_ZONES) {
      return NextResponse.json({ error: `Maximum ${MAX_ZONES} search zones allowed` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tenant_search_zones')
      .insert({
        user_id: user.id,
        label,
        center_lat,
        center_lng,
        radius_miles: radius_miles || 10,
        position: count || 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id parameter required' }, { status: 400 });

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('tenant_search_zones')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Reorder remaining zones
    const { data: remaining } = await supabase
      .from('tenant_search_zones')
      .select('id')
      .eq('user_id', user.id)
      .order('position');

    if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from('tenant_search_zones')
          .update({ position: i })
          .eq('id', remaining[i].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
