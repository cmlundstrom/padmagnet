import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'PadMagnet <noreply@padmagnet.com>';
const DEFAULT_ALERT_EMAIL = 'cmlundstrom@gmail.com';

// POST /api/admin/alerts/test — sends a test alert email
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServiceClient();

    // Get alert email from config
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'alert_email')
      .single();

    const alertEmail = data?.value || DEFAULT_ALERT_EMAIL;

    await resend.emails.send({
      from: FROM,
      to: alertEmail,
      replyTo: 'support@padmagnet.com',
      subject: '[PadMagnet] Test Alert — System Health Check',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #10b981;">✓ Test Alert Received</h2>
          <p>This is a test alert from the PadMagnet Admin Dashboard.</p>
          <p>If you received this email, your alert configuration is working correctly.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            Sent to: ${alertEmail}<br/>
            Time: ${new Date().toISOString()}<br/>
            Reply to: support@padmagnet.com
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, sentTo: alertEmail });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
