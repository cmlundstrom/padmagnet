import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /auth/confirm?token_hash=...&type=email_change
// Server-side OTP verification — prevents email link scanners from consuming tokens.
// After verifyOtp, checks if the email change is fully complete (both confirmations done)
// and syncs the new email to profiles.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/email-confirmed?status=error', request.url));
  }

  // Use anon client for verifyOtp (public auth endpoint, no session needed)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    const errorUrl = new URL('/email-confirmed', request.url);
    errorUrl.searchParams.set('status', 'error');
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }

  // Check if the email change is fully complete
  // After both confirmations, data.user.email is the NEW email and email_change is empty
  const user = data?.user;
  if (user && type === 'email_change') {
    const hasEmailChange = user.new_email && user.email !== user.new_email;

    if (!hasEmailChange) {
      // Both confirmations done — sync new email to profiles
      const service = createServiceClient();
      await service.from('profiles').update({ email: user.email }).eq('id', user.id);

      return NextResponse.redirect(new URL('/email-confirmed?status=complete', request.url));
    } else {
      // First confirmation done, second still needed
      return NextResponse.redirect(new URL('/email-confirmed?status=partial', request.url));
    }
  }

  // Non-email-change flows (shouldn't hit this route, but handle gracefully)
  return NextResponse.redirect(new URL('/email-confirmed?status=complete', request.url));
}
