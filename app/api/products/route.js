import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/products?audience=owner — public, no auth required
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience');

    // Service client with no-store fetch to bypass Next.js fetch cache
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
        },
      }
    );

    let query = supabase
      .from('products')
      .select('id, name, description, price_cents, type, app_path, sort_order')
      .eq('is_active', true)
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
