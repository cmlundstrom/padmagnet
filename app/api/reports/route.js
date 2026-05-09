import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { sanitizeText, isValidUUID } from '../../../lib/validate';
import { checkRateLimit } from '../../../lib/rate-limit';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_CONTENT_TYPES = ['listing', 'user', 'message', 'conversation'];
const VALID_REASONS = [
  'spam',
  'harassment',
  'fake_listing',
  'sexual_content',
  'hate_speech',
  'illegal',
  'scam',
  'other',
];

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const rl = await checkRateLimit('reports', user.id);
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Report limit reached. Try again later.' },
        { status: 429, headers: rl.headers }
      );
    }

    const body = await request.json();
    const { content_type, content_id, reason_code, free_text } = body;

    if (!VALID_CONTENT_TYPES.includes(content_type)) {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 });
    }
    if (!isValidUUID(content_id)) {
      return NextResponse.json({ error: 'Invalid content_id' }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason_code)) {
      return NextResponse.json({ error: 'Invalid reason_code' }, { status: 400 });
    }

    if (content_type === 'user' && content_id === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const cleanFreeText = sanitizeText(free_text || '', 500) || null;

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from('content_reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('content_type', content_type)
      .eq('content_id', content_id)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ id: existing.id, duplicate: true }, { status: 200 });
    }

    const { data: report, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        content_type,
        content_id,
        reason_code,
        free_text: cleanFreeText,
      })
      .select('id, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(report, { status: 201 });
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

    const { data, error } = await supabase
      .from('content_reports')
      .select('id, content_type, content_id, reason_code, status, created_at, resolved_at, resolution_action')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
