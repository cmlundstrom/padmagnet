import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { sanitizeText, isValidUUID } from '../../../lib/validate';
import { checkRateLimit } from '../../../lib/rate-limit';
import { sendTemplateEmail } from '../../../lib/email';
import { NextResponse } from 'next/server';

const DEFAULT_ALERT_EMAIL = 'cmlundstrom@gmail.com';

// Maps backend reason_code to a user-friendly admin label for the email.
const REASON_LABELS = {
  spam: 'Spam',
  fake_listing: 'Fake or misleading listing',
  scam: 'Scam',
  harassment: 'Harassment or abuse',
  sexual_content: 'Sexual content',
  hate_speech: 'Hate speech',
  illegal: 'Illegal activity',
  other: 'Other',
};

// Pluralizes content_type for the alert-bar headline.
const CONTENT_TYPE_LABELS = {
  listing: 'LISTING',
  user: 'USER',
  message: 'MESSAGE',
  conversation: 'CONVERSATION',
};

/** Escape HTML for embedding into email body. */
function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Fire-and-forget admin notification — never throw, log on failure. */
async function notifyAdminOfReport(report, reporterEmail) {
  try {
    const supabase = createServiceClient();
    const { data: cfg } = await supabase
      .from('site_config').select('value').eq('key', 'alert_email').maybeSingle();
    const adminEmail = cfg?.value || DEFAULT_ALERT_EMAIL;

    const reasonLabel = REASON_LABELS[report.reason_code] || report.reason_code;
    const contentTypeLabel = CONTENT_TYPE_LABELS[report.content_type] || report.content_type.toUpperCase();
    const safeFreeText = report.free_text ? escapeHtml(report.free_text) : null;
    const freeTextBlock = safeFreeText
      ? `<div style="background:#FFF7ED;border-left:4px solid #F59E0B;border-radius:0 6px 6px 0;padding:14px 16px;margin:0 0 16px">
          <p style="font-size:12px;font-weight:600;color:#B45309;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">Reporter notes</p>
          <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;white-space:pre-wrap">${safeFreeText}</p>
        </div>`
      : '';

    await sendTemplateEmail('admin_content_report_flag', adminEmail, {
      report_id: report.id,
      content_type: report.content_type,
      content_type_label: contentTypeLabel,
      content_id: report.content_id,
      reason_code: reasonLabel,
      reporter_email: reporterEmail || '(unknown)',
      created_at: new Date(report.created_at).toLocaleString('en-US', {
        timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short',
      }) + ' ET',
      free_text_block: freeTextBlock,
      admin_url: 'https://padmagnet.com/admin#reports',
    });
  } catch (err) {
    console.error('Admin report notification failed:', err.message);
  }
}

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
      .select('id, created_at, content_type, content_id, reason_code, free_text')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Admin notification — fire-and-forget so a downstream email failure
    // never blocks the user-facing 201 response. Uses sendTemplateEmail
    // pattern (email_templates table, admin-editable in Admin > Templates).
    notifyAdminOfReport(report, user.email);

    return NextResponse.json({ id: report.id, created_at: report.created_at }, { status: 201 });
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
