import { createSupabaseServer } from '../../../../lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/admin/auth — logout
export async function POST(request) {
  try {
    const { action } = await request.json();

    if (action === 'logout') {
      const supabase = createSupabaseServer();
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
