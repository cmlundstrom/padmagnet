import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/config?keys=bridge_portal_url,bridge_notes
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get('keys')?.split(',') || [];

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

// PATCH /api/admin/config — { key: "bridge_notes", value: "new text" }
export async function PATCH(request) {
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('site_config')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
