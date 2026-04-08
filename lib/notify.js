/**
 * Notification routing — immediate send with retry queue fallback.
 *
 * First delivery attempt is synchronous for instant feel.
 * If the immediate send fails, the message is enqueued in
 * message_delivery_queue for retry by the delivery-retry cron.
 *
 * Supports two conversation types:
 * - internal_owner: recipient is a PadMagnet user (profile lookup, push, channel pref)
 * - external_agent: recipient is an MLS agent with no PadMagnet account
 *   (email preferred, SMS fallback, no push, contact info from conversation row)
 */

import { sendSMS } from './sms';
import { sendNotificationEmail, sendExternalAgentEmail } from './email';
import { sendPushNotification } from './push';
import { createServiceClient } from './supabase';

/**
 * Notify an internal PadMagnet user (owner or tenant).
 * Routes by preferred_channel, always sends push if token exists.
 */
export async function notifyRecipient(message, conversation, recipient) {
  const supabase = createServiceClient();
  const channel = recipient.preferred_channel || 'in_app';

  // Always attempt push notification (PadMagnet users only)
  if (recipient.expo_push_token) {
    await sendImmediatelyOrEnqueue(supabase, message.id, recipient.id, 'push', {
      token: recipient.expo_push_token,
      title: `Message from ${message.sender_name}`,
      body: message.body.slice(0, 100),
      data: { conversationId: conversation.id },
    });
  }

  // Always send email notification — universal baseline, costs nothing
  if (recipient.email) {
    await sendImmediatelyOrEnqueue(supabase, message.id, recipient.id, 'email', {
      to: recipient.email,
      recipient_name: recipient.display_name,
      sender_name: message.sender_name,
      listing_address: conversation.listing_address,
      message_preview: message.body.slice(0, 300),
      inbox_url: `${process.env.NEXT_PUBLIC_APP_URL}/conversation/${conversation.id}`,
      conversationId: conversation.id,
    });
  }

  // Additional SMS notification if owner opted in
  if (channel === 'sms' && recipient.phone && recipient.sms_consent) {
    await sendImmediatelyOrEnqueue(supabase, message.id, recipient.id, 'sms', {
      to: recipient.phone,
      listing_address: conversation.listing_address,
      sender_name: message.sender_name,
      message_preview: message.body.slice(0, 140),
    });
  }
}

/**
 * Notify an external MLS agent who has no PadMagnet account.
 * Email is preferred (agents check email); SMS is fallback.
 * No push notification (they have no app installed).
 */
export async function notifyExternalAgent(message, conversation) {
  const supabase = createServiceClient();
  const { external_agent_name, external_agent_email } = conversation;

  // Email only — no SMS to external agents (avoids phone_mappings collisions
  // and spam-looking texts from unknown numbers). Agent contact info is shown
  // immediately to the renter in the conversation thread as fallback.
  if (!external_agent_email) {
    console.warn('[Notify] External agent has no email:', conversation.id);
    return;
  }

  // Fetch renter profile for lead details
  let renterEmail = null, renterPhone = null;
  if (message.sender_id) {
    const { data: renter } = await supabase
      .from('profiles')
      .select('email, phone')
      .eq('id', message.sender_id)
      .single();
    renterEmail = renter?.email || null;
    renterPhone = renter?.phone || null;
  }

  await sendImmediatelyOrEnqueue(supabase, message.id, null, 'email', {
    to: external_agent_email,
    recipient_name: external_agent_name || 'Listing Agent',
    sender_name: message.sender_name,
    sender_email: renterEmail,
    sender_phone: renterPhone,
    message_time: new Date(message.created_at).toLocaleString('en-US', {
      dateStyle: 'medium', timeStyle: 'short',
    }),
    listing_address: conversation.listing_address,
    message_preview: message.body.slice(0, 300),
    conversationId: conversation.id,
    isExternalAgent: true,
  });
}

/**
 * Attempt immediate delivery; enqueue for retry on failure.
 * recipientId is NULL for external agent deliveries.
 */
async function sendImmediatelyOrEnqueue(supabase, messageId, recipientId, channel, payload) {
  try {
    if (channel === 'sms') {
      const body = payload.isExternalAgent
        ? `Hi ${payload.agent_name}, a renter on PadMagnet is interested in ${payload.listing_address}. They said: "${payload.message_preview}" — Reply to this text to respond.`
        : `PadMagnet: New message about ${payload.listing_address} from ${payload.sender_name}. Reply here or open the app to respond.`;
      const { sid } = await sendSMS(payload.to, body);
      await supabase.from('messages').update({ external_id: sid, delivery_status: 'sent' }).eq('id', messageId);
      // Record successful delivery in queue for audit trail
      await supabase.from('message_delivery_queue').insert({
        message_id: messageId,
        recipient_id: recipientId,
        channel,
        payload,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        attempts: 1,
      });
    } else if (channel === 'email') {
      if (payload.isExternalAgent) {
        await sendExternalAgentEmail(payload);
      } else {
        await sendNotificationEmail(payload);
      }
      // Record successful email delivery
      await supabase.from('message_delivery_queue').insert({
        message_id: messageId,
        recipient_id: recipientId,
        channel,
        payload,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        attempts: 1,
      });
    } else if (channel === 'push') {
      await sendPushNotification(payload.token, payload.title, payload.body, payload.data);
    }
  } catch (err) {
    console.error(`Immediate ${channel} delivery failed, enqueueing for retry:`, err.message);
    await supabase.from('message_delivery_queue').insert({
      message_id: messageId,
      recipient_id: recipientId,
      channel,
      payload,
      attempts: 1,
      last_error: err.message,
      next_attempt_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    });
  }
}
