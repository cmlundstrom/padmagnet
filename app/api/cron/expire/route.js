import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronSecret(token) {
  if (!token || !CRON_SECRET) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(CRON_SECRET));
  } catch {
    return false;
  }
}

// GET handler for Vercel Cron — expires owner listings past their expires_at
export async function GET(request) {
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not set — refusing to run expire cron');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!verifyCronSecret(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Expire owner listings that have passed their expires_at
    // MLS listings are controlled by Bridge sync only — never touch them here
    const { data: expired, error } = await supabase
      .from('listings')
      .update({ status: 'expired', is_active: false })
      .eq('source', 'owner')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expired: expired?.length || 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
