/**
 * Transactional email helper using Resend + email_templates table.
 * Templates use {{variable}} interpolation.
 */

import { Resend } from 'resend';
import { createServiceClient } from './supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using a template from the email_templates table.
 * @param {string} slug - Template slug (e.g. 'payment_confirmation')
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

  // Interpolate variables
  for (const [key, value] of Object.entries(variables)) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(re, value ?? '');
    subject = subject.replace(re, value ?? '');
  }

  // If body_html is empty, generate a simple HTML body from variables
  if (!html.trim()) {
    html = generateDefaultHtml(subject, variables);
  }

  try {
    const result = await resend.emails.send({
      from: 'PadMagnet <noreply@padmagnet.com>',
      to,
      subject,
      html,
    });
    return result;
  } catch (err) {
    console.error(`Failed to send email (${slug}):`, err.message);
    return null;
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
      <p style="color:#999;font-size:12px">PadMagnet.com — Don't miss your perfect rental home match!</p>
    </div>
  `;
}
