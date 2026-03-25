import { createServiceClient } from '../../../../lib/supabase';
import { sendTemplateEmail } from '../../../../lib/email';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://padmagnet.com';

function verifyCronSecret(token) {
  if (!token || !CRON_SECRET) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(CRON_SECRET));
  } catch {
    return false;
  }
}

// Runs daily — sends 7-day, 3-day, 1-day expiry reminders + expired notices
export async function GET(request) {
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not set — refusing to run expiry-emails cron');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!verifyCronSecret(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    const now = new Date();
    let sent = 0;

    // Helper: date N days from now (start of day)
    const daysFromNow = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() + n);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const reminders = [
      { days: 7, slug: 'expiry_7day' },
      { days: 3, slug: 'expiry_3day' },
      { days: 1, slug: 'expiry_1day' },
    ];

    for (const { days, slug } of reminders) {
      const start = daysFromNow(days);
      const end = daysFromNow(days + 1);

      // Find owner listings expiring in this window
      const { data: listings } = await supabase
        .from('listings')
        .select('id, owner_user_id, street_name, city, expires_at')
        .eq('source', 'owner')
        .eq('status', 'active')
        .gte('expires_at', start.toISOString())
        .lt('expires_at', end.toISOString());

      for (const listing of (listings || [])) {
        // Get owner email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('id', listing.owner_user_id)
          .single();

        if (!profile?.email) continue;

        const address = `${listing.street_name}, ${listing.city}`;
        await sendTemplateEmail(slug, profile.email, {
          owner_name: profile.display_name || 'Property Owner',
          listing_address: address,
          expires_at: new Date(listing.expires_at).toLocaleDateString(),
          renew_url: `${APP_URL}/renew?listing_id=${listing.id}&action=renew`,
        });
        sent++;
      }
    }

    // Send "listing expired" emails for newly expired listings (expired today)
    const todayStart = daysFromNow(0);
    const todayEnd = daysFromNow(1);

    const { data: expiredListings } = await supabase
      .from('listings')
      .select('id, owner_user_id, street_name, city')
      .eq('source', 'owner')
      .eq('status', 'expired')
      .gte('expires_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lt('expires_at', now.toISOString());

    for (const listing of (expiredListings || [])) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', listing.owner_user_id)
        .single();

      if (!profile?.email) continue;

      const address = `${listing.street_name}, ${listing.city}`;
      await sendTemplateEmail('listing_expired', profile.email, {
        owner_name: profile.display_name || 'Property Owner',
        listing_address: address,
        renew_url: `${APP_URL}/renew?listing_id=${listing.id}&action=renew`,
      });
      sent++;
    }

    await supabase.from('cron_logs').insert({ job_name: 'expiry_emails', status: 'success', duration_ms: Date.now() - startTime, result: { sent } });
    return NextResponse.json({ sent });
  } catch (err) {
    await supabase.from('cron_logs').insert({ job_name: 'expiry_emails', status: 'failed', duration_ms: Date.now() - startTime, error_message: err.message }).catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
