import { createServiceClient } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET — return visible display field configs (public, no auth required)
// ?role=owner returns fields visible to owners; default returns tenant-visible fields
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const visibleCol = role === 'owner' ? 'visible_owner' : 'visible';

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('display_field_configs')
      .select('*')
      .eq(visibleCol, true)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
