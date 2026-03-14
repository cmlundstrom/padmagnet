/**
 * Twilio SMS helper.
 * Sends SMS and validates inbound webhook signatures.
 */

import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Send an SMS message.
 * @param {string} to - E.164 phone number
 * @param {string} body - Message text
 * @returns {{ sid: string, status: string }}
 */
export async function sendSMS(to, body) {
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
