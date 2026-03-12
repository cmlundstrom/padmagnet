import { createServiceClient } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /auth/confirm?token_hash=...&type=email_change
// Server-side OTP verification — prevents email link scanners from consuming tokens.
// Uses service role client so verifyOtp works without a user session.
// After verification, syncs the new email to the profiles table.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/email-confirmed?status=error', request.url));
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    const errorUrl = new URL('/email-confirmed', request.url);
    errorUrl.searchParams.set('status', 'error');
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }

  // Sync the confirmed email to profiles table
  if (type === 'email_change') {
    // data.user may or may not have the updated email depending on timing.
    // Query auth.users directly via admin API to get the definitive email.
    const userId = data?.user?.id;
    if (userId) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        await supabase.from('profiles').update({ email: authUser.user.email }).eq('id', userId);
      }
    }
  }

  return NextResponse.redirect(new URL('/email-confirmed?status=complete', request.url));
}
