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
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      ${paragraphs}
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">PadMagnet.com &copy; PadMagnet LLC.</p>
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
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <p>Hi ${recipient_name},</p>
      <p><strong>${sender_name}</strong> sent you a message about <strong>${listing_address}</strong>:</p>
      <blockquote>${message_preview}</blockquote>
      <p>Reply to this email or <a href="${inbox_url}">open the app</a> to respond.</p>
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">PadMagnet.com &copy; PadMagnet LLC.</p>
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
export async function sendExternalAgentEmail({ to, recipient_name, listing_address, message_preview, conversationId }) {
  const replyTo = `conv-${conversationId}@${process.env.RESEND_INBOUND_DOMAIN}`;

  const vars = { recipient_name, listing_address, message_preview, agent_name: recipient_name };

  // Try admin template first
  const tpl = await fetchMessageTemplate('external_agent_email', vars);

  const subject = tpl?.subject || `Rental inquiry about ${listing_address}`;
  const html = tpl?.html || `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <p>Hi ${recipient_name},</p>
      <p>A renter on PadMagnet is interested in your listing at <strong>${listing_address}</strong>.</p>
      <blockquote>${message_preview}</blockquote>
      <p>Simply reply to this email to respond directly to the renter.</p>
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">PadMagnet.com &copy; PadMagnet LLC.</p>
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
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#0F2B46">${subject}</h2>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">PadMagnet.com &copy; PadMagnet LLC.</p>
    </div>
  `;
}
