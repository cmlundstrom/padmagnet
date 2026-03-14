/**
 * Push Token Registration
 *
 * Stores or clears the user's Expo push token on their profile.
 * Called from the mobile app on launch and when permissions change.
 */

import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { token } = await request.json();

    // token can be null to clear it (e.g. user revoked notification permission)
    if (token !== null && token !== undefined && typeof token !== 'string') {
      return NextResponse.json({ error: 'token must be a string or null' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token || null })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
