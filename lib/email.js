/**
 * Transactional email helper using Resend.
 *
 * Template sources:
 * - sendTemplateEmail()      → email_templates table (transactional: listing confirmed, expiry, etc.)
 * - sendNotificationEmail()  → message_templates table (slug: new_message_email)
 * - sendExternalAgentEmail() → message_templates table (slug: external_agent_email)
 *
 * All templates are admin-editable via Admin > Templates.
 */

import { Resend } from 'resend';
import { createServiceClient } from './supabase';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'PadMagnet <noreply@padmagnet.com>';

/** Branded email footer — used on ALL outbound emails */
function emailFooter() {
  return `
    <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 24px;text-align:center">
      <p style="font-size:13px;color:#64748b;margin:0 0 8px">
        <strong>The PadMagnet Team</strong>
      </p>
      <p style="font-size:12px;color:#94a3b8;margin:0">
        <a href="https://padmagnet.com" style="color:#3B82F6;text-decoration:none">padmagnet.com</a>
        &nbsp;&middot;&nbsp; A Rental Matching Platform, Hyperlocal by Design
      </p>
      <p style="font-size:11px;color:#cbd5e1;margin:8px 0 0">&copy; ${new Date().getFullYear()} PadMagnet LLC. All rights reserved.</p>
    </div>
  `;
}

/**
 * Fetch a message_template by slug, interpolate variables, return { subject, html }.
 * Returns null if template not found or inactive.
 */
async function fetchMessageTemplate(slug, variables = {}) {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('message_templates')
      .select('subject, body')
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('channel', 'email')
      .single();

    if (!data) return null;

    let subject = data.subject || '';
    let body = data.body || '';

    for (const [key, value] of Object.entries(variables)) {
      const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(re, value ?? '');
      body = body.replace(re, value ?? '');
    }

    // Wrap plain text body in basic HTML if it doesn't contain tags
    const html = body.includes('<') ? body : wrapInHtml(body);

    return { subject, html };
  } catch (err) {
    console.error(`Failed to fetch message template "${slug}":`, err.message);
    return null;
  }
}

/** Wrap plain text in branded HTML email layout */
function wrapInHtml(text) {
  const paragraphs = text.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('');
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:#0B1D3A;padding:16px 24px;text-align:center">
        <img src="https://padmagnet.com/logo/PM_LOGO_180px180p.png" alt="PadMagnet" width="32" height="32" style="vertical-align:middle;margin-right:8px;border-radius:6px">
        <span style="font-size:20px;font-weight:bold;color:#ffffff;vertical-align:middle">Pad</span><span style="font-size:20px;font-weight:bold;color:#F95E0C;vertical-align:middle">Magnet</span>
      </div>
      <div style="padding:24px">
        ${paragraphs}
      </div>
      ${emailFooter()}
    </div>
  `;
}

/**
 * Send an email using a template from the email_templates table.
 * @param {string} slug - Template slug (e.g. 'listing_confirmed')
 * @param {string} to - Recipient email
 * @param {Object} variables - Key-value pairs for {{variable}} replacement
 */
export async function sendTemplateEmail(slug, to, variables = {}) {
  const supabase = createServiceClient();

  const { data: template, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    console.error(`Email template "${slug}" not found or inactive`);
    return null;
  }

  let html = template.body_html || '';
  let subject = template.subject;

  for (const [key, value] of Object.entries(variables)) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(re, value ?? '');
    subject = subject.replace(re, value ?? '');
  }

  if (!html.trim()) {
    html = generateDefaultHtml(subject, variables);
  }

  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return result;
  } catch (err) {
    console.error(`Failed to send email (${slug}):`, err.message);
    return null;
  }
}

/**
 * Send a notification email to a PadMagnet user about a new message.
 * Reads from message_templates slug: new_message_email
 * Sets replyTo header so email replies route back into the conversation.
 */
export async function sendNotificationEmail({ to, recipient_name, sender_name, listing_address, message_preview, inbox_url, conversationId }) {
  const replyTo = conversationId
    ? `conv-${conversationId}@${process.env.RESEND_INBOUND_DOMAIN}`
    : undefined;

  const vars = { recipient_name, sender_name, listing_address, message_preview, inbox_url };

  // Try admin template first
  const tpl = await fetchMessageTemplate('new_message_email', vars);

  const subject = tpl?.subject || `New message about ${listing_address}`;
  const html = tpl?.html || `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:#0B1D3A;padding:16px 24px;text-align:center">
        <img src="https://padmagnet.com/logo/PM_LOGO_180px180p.png" alt="PadMagnet" width="32" height="32" style="vertical-align:middle;margin-right:8px;border-radius:6px">
        <span style="font-size:20px;font-weight:bold;color:#ffffff;vertical-align:middle">Pad</span><span style="font-size:20px;font-weight:bold;color:#F95E0C;vertical-align:middle">Magnet</span>
      </div>
      <div style="padding:24px">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px">Hi ${recipient_name},</p>
        <p style="font-size:15px;color:#333;margin:0 0 16px">
          <strong>${sender_name}</strong> sent you a message about <strong>${listing_address}</strong>:
        </p>
        <div style="background:#FFF7ED;border-left:4px solid #F59E0B;padding:14px 16px;border-radius:0 6px 6px 0;font-size:15px;color:#1a1a1a;line-height:1.6;margin:0 0 20px">
          ${message_preview}
        </div>
        <p style="font-size:15px;color:#333;margin:0 0 20px">
          <strong>Reply to this email</strong> or <a href="${inbox_url}" style="color:#3B82F6">open the app</a> to respond.
        </p>
      </div>
      ${emailFooter()}
    </div>
  `;

  try {
    const result = await resend.emails.send({ from: FROM, to, replyTo, subject, html });
    return result;
  } catch (err) {
    console.error('Failed to send notification email:', err.message);
    throw err;
  }
}

/**
 * Send an email to an external MLS agent about a rental inquiry.
 * Reads from message_templates slug: external_agent_email
 * Agent replies to this email and it routes back into the tenant's
 * in-app conversation via the Resend inbound webhook.
 */
export async function sendExternalAgentEmail({ to, recipient_name, sender_name, sender_email, sender_phone, message_time, listing_address, message_preview, conversationId }) {
  const replyTo = `conv-${conversationId}@${process.env.RESEND_INBOUND_DOMAIN}`;

  const vars = { recipient_name, listing_address, message_preview, agent_name: recipient_name, sender_name, sender_email, sender_phone, message_time };

  // Try admin template first
  const tpl = await fetchMessageTemplate('external_agent_email', vars);

  const subject = tpl?.subject || `Rental Inquiry: ${listing_address}`;

  // Lead details section
  const leadDetails = [
    `<strong>${sender_name || 'A renter'}</strong>`,
    sender_email ? `<a href="mailto:${sender_email}" style="color:#3B82F6">${sender_email}</a>` : null,
    sender_phone ? `<a href="tel:${sender_phone}" style="color:#3B82F6">${sender_phone}</a>` : null,
    message_time ? `<span style="color:#888">Sent: ${message_time}</span>` : null,
  ].filter(Boolean).join('<br>');

  const html = tpl?.html || `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <!-- Header -->
      <div style="background:#0B1D3A;padding:20px 24px;text-align:center">
        <img src="https://padmagnet.com/logo/PM_LOGO_180px180p.png" alt="PadMagnet" width="36" height="36" style="vertical-align:middle;margin-right:10px;border-radius:6px">
        <span style="font-size:22px;font-weight:bold;color:#ffffff;vertical-align:middle">Pad</span><span style="font-size:22px;font-weight:bold;color:#F95E0C;vertical-align:middle">Magnet</span>
      </div>

      <div style="padding:24px">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px">Hi ${recipient_name},</p>

        <p style="font-size:15px;color:#333;margin:0 0 20px">
          A renter on PadMagnet is interested in your listing at <strong>${listing_address}</strong>.
        </p>

        <!-- Lead Details Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px">
          <p style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px">Your Lead Details</p>
          <p style="font-size:14px;color:#1a1a1a;margin:0;line-height:1.8">
            ${leadDetails}
          </p>
        </div>

        <!-- Renter Message -->
        <div style="margin:0 0 20px">
          <p style="font-size:13px;font-weight:600;color:#64748b;margin:0 0 8px">
            ${sender_name || 'Your lead'} wrote:
          </p>
          <div style="background:#FFF7ED;border-left:4px solid #F59E0B;padding:14px 16px;border-radius:0 6px 6px 0;font-size:15px;color:#1a1a1a;line-height:1.6">
            ${message_preview}
          </div>
        </div>

        <!-- CTA -->
        <p style="font-size:15px;color:#333;margin:0 0 24px">
          Simply <strong>reply to this email</strong> to respond directly to the renter with current property status and any application or qualification requirements.
        </p>

        <div style="text-align:center;margin:0 0 8px">
          <a href="mailto:${replyTo}?subject=Re: Rental Inquiry: ${listing_address}" style="display:inline-block;background:#E8603C;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600">Reply to This Lead</a>
        </div>
      </div>

      ${emailFooter()}
    </div>
  `;

  try {
    const result = await resend.emails.send({ from: FROM, to, replyTo, subject, html });
    return result;
  } catch (err) {
    console.error('Failed to send external agent email:', err.message);
    throw err;
  }
}

function generateDefaultHtml(subject, variables) {
  const rows = Object.entries(variables)
    .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#666">${k.replace(/_/g, ' ')}</td><td style="padding:4px 8px">${v}</td></tr>`)
    .join('');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:#0B1D3A;padding:16px 24px;text-align:center">
        <img src="https://padmagnet.com/logo/PM_LOGO_180px180p.png" alt="PadMagnet" width="32" height="32" style="vertical-align:middle;margin-right:8px;border-radius:6px">
        <span style="font-size:20px;font-weight:bold;color:#ffffff;vertical-align:middle">Pad</span><span style="font-size:20px;font-weight:bold;color:#F95E0C;vertical-align:middle">Magnet</span>
      </div>
      <div style="padding:24px">
        <h2 style="color:#0F2B46;margin:0 0 16px">${subject}</h2>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
      ${emailFooter()}
    </div>
  `;
}
