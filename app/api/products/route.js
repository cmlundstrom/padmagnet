import { supabase } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/products?audience=owner — public, RLS enforces is_active = true
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience');

    let query = supabase
      .from('products')
      .select('id, name, description, price_cents, type, app_path, sort_order')
      .order('sort_order', { ascending: true });

    if (audience) {
      query = query.eq('audience', audience);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
