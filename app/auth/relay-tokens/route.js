import { createServiceClient } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /auth/relay-tokens
// Called by the desktop mobile-callback page to relay magic link tokens
// to the mobile app via Supabase Realtime (INSERT triggers the subscription).
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { nonce, access_token, refresh_token } = body;

  if (!nonce || !access_token || !refresh_token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Validate nonce is a UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nonce)) {
    return NextResponse.json({ error: 'Invalid nonce' }, { status: 400 });
  }

  // Extract user_id from JWT for audit (don't verify — Supabase already did)
  let userId = null;
  try {
    userId = JSON.parse(atob(access_token.split('.')[1])).sub;
  } catch {}

  const supabase = createServiceClient();

  // Clean expired rows opportunistically
  await supabase.rpc('clean_expired_relay_tokens').catch(() => {});

  // Insert relay row — triggers Realtime for the mobile subscriber
  const { error } = await supabase.from('magic_link_relay').insert({
    nonce,
    tokens: JSON.stringify({ access_token, refresh_token }),
    user_id: userId,
  });

  if (error) {
    // Duplicate nonce = already relayed, treat as success
    if (error.code === '23505') {
      return NextResponse.json({ ok: true });
    }
    console.error('[relay-tokens] Insert failed:', error.message);
    return NextResponse.json({ error: 'Relay failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
