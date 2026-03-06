import { createServiceClient } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET — return visible display field configs (public, no auth required)
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('display_field_configs')
      .select('*')
      .eq('visible', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
