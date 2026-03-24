import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  subject: 'Check out this rental: {{address}}, {{city}} — {{price}}',
  body: 'Check out this rental on PadMagnet! {{address}}, {{city}} — {{price}}\nhttps://padmagnet.com/listing/{{id}}',
};

// GET /api/templates/share — reads share template from site_config
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('site_config')
      .select('key, value')
      .in('key', ['share_subject', 'share_message']);

    const cfg = Object.fromEntries((data || []).map(r => [r.key, r.value]));

    return NextResponse.json({
      subject: cfg.share_subject || DEFAULTS.subject,
      body: cfg.share_message || DEFAULTS.body,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    return NextResponse.json(DEFAULTS);
  }
}
