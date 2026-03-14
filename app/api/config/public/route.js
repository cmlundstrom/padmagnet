import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Keys safe to expose without auth
const PUBLIC_KEYS = ['owner_listing_footer'];

// GET /api/config/public?keys=owner_listing_footer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = (searchParams.get('keys') || '').split(',').filter(Boolean);
    const keys = requested.filter(k => PUBLIC_KEYS.includes(k));

    if (keys.length === 0) {
      return NextResponse.json({});
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('site_config')
      .select('key, value')
      .in('key', keys);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const config = {};
    for (const row of (data || [])) {
      config[row.key] = row.value;
    }
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
