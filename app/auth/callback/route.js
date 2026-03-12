import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '../../../lib/supabase';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/admin';

  // Route to appropriate destination based on flow type
  let destination = next;
  if (type === 'recovery') destination = '/reset-password';
  if (type === 'email_change') destination = '/email-confirmed';

  const redirectUrl = new URL(destination, request.url);
  const response = NextResponse.redirect(redirectUrl);

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Exchange code (normal auth flows) or verify token_hash (magic link flows)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (token_hash) {
    await supabase.auth.verifyOtp({ type: type || 'magiclink', token_hash });
  }

  // After email change confirmation, sync the new email to profiles table
  if (type === 'email_change') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const service = createServiceClient();
      await service.from('profiles').update({ email: user.email }).eq('id', user.id);
    }
  }

  return response;
}
