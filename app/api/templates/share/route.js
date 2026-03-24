import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/templates/share — public endpoint for share template
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('message_templates')
      .select('subject, body')
      .eq('name', 'share_template')
      .eq('is_active', true)
      .single();

    if (!data) {
      return NextResponse.json({
        subject: 'Check out this rental: {{address}}, {{city}} — {{price}}',
        body: 'Check out this rental on PadMagnet! {{address}}, {{city}} — {{price}}\nhttps://padmagnet.com/listing/{{id}}',
      });
    }

    return NextResponse.json({
      subject: data.subject,
      body: data.body,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
