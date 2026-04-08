/**
 * Twilio SMS helper.
 * Sends SMS and validates inbound webhook signatures.
 */

import twilio from 'twilio';
import { createServiceClient } from './supabase';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const MAX_SMS_PER_WEEK = 5;

/**
 * Send an SMS message.
 * @param {string} to - E.164 phone number
 * @param {string} body - Message text
 * @returns {{ sid: string, status: string }}
 */
export async function sendSMS(to, body, { skipFrequencyCap = false } = {}) {
  // A2P compliance: max 5 SMS/week per recipient (outbound notifications only)
  if (!skipFrequencyCap) {
    const supabase = createServiceClient();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('to_phone', to)
      .eq('channel', 'sms')
      .gte('created_at', weekAgo);
    if ((count || 0) >= MAX_SMS_PER_WEEK) {
      console.warn(`[SMS] Frequency cap reached for ${to} (${count}/${MAX_SMS_PER_WEEK}/week), skipping`);
      return { sid: null, status: 'frequency_capped' };
    }
  }

  const message = await client.messages.create({
    to,
    from: TWILIO_NUMBER,
    body,
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-status`,
  });
  return { sid: message.sid, status: message.status };
}

/**
 * Validate Twilio webhook signature.
 * @param {Request} req - Incoming request
 * @param {string} url - Full webhook URL
 * @param {Object} params - Parsed form params
 * @returns {boolean}
 */
export function validateTwilioSignature(req, url, params) {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers.get('x-twilio-signature'),
    url,
    params
  );
}
