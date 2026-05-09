import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { sanitizeText, isValidUUID } from '../../../lib/validate';
import { checkRateLimit } from '../../../lib/rate-limit';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const rl = await checkRateLimit('blocks', user.id);
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Block limit reached. Try again later.' },
        { status: 429, headers: rl.headers }
      );
    }

    const body = await request.json();
    const { blocked_id, reason_code, free_text } = body;

    if (!isValidUUID(blocked_id)) {
      return NextResponse.json({ error: 'Invalid blocked_id' }, { status: 400 });
    }
    if (blocked_id === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const cleanFreeText = sanitizeText(free_text || '', 500) || null;
    const cleanReason = typeof reason_code === 'string' ? reason_code.slice(0, 50) : null;

    const supabase = createServiceClient();

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', blocked_id)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('user_blocks')
      .upsert(
        {
          blocker_id: user.id,
          blocked_id,
          reason_code: cleanReason,
          free_text: cleanFreeText,
        },
        { onConflict: 'blocker_id,blocked_id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const supabase = createServiceClient();

    const { data: blocks, error } = await supabase
      .from('user_blocks')
      .select('blocked_id, reason_code, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ blocks: [] });
    }

    const ids = blocks.map((b) => b.blocked_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enriched = blocks.map((b) => {
      const p = profileMap.get(b.blocked_id);
      return {
        blocked_id: b.blocked_id,
        display_name: p?.display_name || null,
        email: p?.email || null,
        reason_code: b.reason_code,
        created_at: b.created_at,
      };
    });

    return NextResponse.json({ blocks: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
