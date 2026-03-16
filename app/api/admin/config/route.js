import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// Whitelist of allowed config keys — prevents arbitrary reads/writes to site_config
const ALLOWED_CONFIG_KEYS = [
  'bridge_portal_url', 'bridge_notes',
  'owner_listing_footer', 'mls_listing_footer',
  'owner_empty_state', 'owner_upgrade_page', 'owner_post_activation',
  'owner_explore_tab', 'market_stats', 'upgrade_page',
  'share_subject', 'share_message', 'share_templates_active',
];

// GET /api/admin/config?keys=bridge_portal_url,bridge_notes
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const keys = (searchParams.get('keys')?.split(',') || [])
      .filter(k => ALLOWED_CONFIG_KEYS.includes(k));

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
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 });
    }

    if (!ALLOWED_CONFIG_KEYS.includes(key)) {
      return NextResponse.json({ error: `Config key "${key}" is not allowed` }, { status: 403 });
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
