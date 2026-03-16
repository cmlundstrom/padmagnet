import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const rowId = searchParams.get('row_id');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit')) || 50;

    const supabase = createServiceClient();
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (table) query = query.eq('table_name', table);
    if (rowId) query = query.eq('row_id', rowId);
    if (action) query = query.eq('action', action);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
