import { createSupabaseServer } from '../../../lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/admin';

  if (code) {
    const supabase = createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Route password recovery to the reset page
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
