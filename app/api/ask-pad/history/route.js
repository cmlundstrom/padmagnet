/**
 * Ask Pad Chat History — hybrid persistence sync endpoint.
 *
 * GET  /api/ask-pad/history  → return user's saved chat messages
 * PUT  /api/ask-pad/history  → upsert messages array (capped at 50)
 *
 * Also used by admin panel (via service role) to read any user's history.
 */

import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { requireAdmin } from '../../../../lib/admin-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 50;

// GET — fetch chat history
// ?user_id=xxx  (admin only — fetch another user's history)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('user_id');

  // If requesting another user's chat, require admin
  if (targetUserId) {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('askpad_chats')
      .select('messages, updated_at')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      messages: data?.messages || [],
      updated_at: data?.updated_at || null,
    });
  }

  // Normal user — fetch own history
  const { user, error: authErr, status } = await getAuthUser(request);
  if (authErr) return NextResponse.json({ error: authErr }, { status });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('askpad_chats')
    .select('messages, updated_at')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: data?.messages || [],
    updated_at: data?.updated_at || null,
  });
}

// PUT — upsert chat messages
export async function PUT(request) {
  const { user, error: authErr, status } = await getAuthUser(request);
  if (authErr) return NextResponse.json({ error: authErr }, { status });

  const body = await request.json();
  let { messages } = body;

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
  }

  // Cap at server side too
  messages = messages.slice(-MAX_MESSAGES);

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('askpad_chats')
    .upsert({
      user_id: user.id,
      messages,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
