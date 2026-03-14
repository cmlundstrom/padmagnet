/**
 * Twilio Inbound SMS Webhook
 *
 * Receives SMS replies from both PadMagnet users and external MLS agents.
 * Routes them into the correct conversation via phone_mappings lookup.
 *
 * External agents have user_id = NULL in phone_mappings and sender_id = NULL
 * in messages. Their replies always increment tenant_unread_count.
 */

import { createServiceClient } from '../../../../lib/supabase';
import { validateTwilioSignature } from '../../../../lib/sms';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = createServiceClient();
  let logId = null;

  try {
    const formData = await request.formData();
    const params = Object.fromEntries(formData.entries());
    const { From, To, Body, MessageSid, OptOutType } = params;

    // Log every inbound webhook
    const { data: log } = await supabase
      .from('webhook_logs')
      .insert({
        source: 'twilio',
        event_type: OptOutType ? `opt_out_${OptOutType}` : 'inbound_sms',
        external_id: MessageSid,
        payload: params,
      })
      .select('id')
      .single();
    logId = log?.id;

    // Validate signature
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;
    if (!validateTwilioSignature(request, url, params)) {
      await updateLog(supabase, logId, 'failed', 'Invalid signature');
      return new Response('<Response/>', {
        status: 403,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // STOP/START handling — only applies to PadMagnet users with profiles.
    // External agents have no profile; Twilio auto-enforces STOP at carrier
    // level for 10DLC numbers.
    if (OptOutType === 'STOP') {
      await supabase
        .from('profiles')
        .update({ sms_consent: false })
        .eq('phone', From);
      await updateLog(supabase, logId, 'processed');
      return twiml('You have been unsubscribed from PadMagnet SMS. Reply START to re-subscribe.');
    }

    if (OptOutType === 'START') {
      await supabase
        .from('profiles')
        .update({ sms_consent: true, sms_consent_at: new Date().toISOString() })
        .eq('phone', From);
      await updateLog(supabase, logId, 'processed');
      return twiml('You have been re-subscribed to PadMagnet SMS notifications.');
    }

    // Dedup — prevent double-insertion from duplicate webhooks
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('external_id', MessageSid)
      .maybeSingle();

    if (existing) {
      await updateLog(supabase, logId, 'duplicate');
      return twiml();
    }

    // Lookup phone mapping to find the conversation
    const { data: mapping } = await supabase
      .from('phone_mappings')
      .select('conversation_id, user_id')
      .eq('twilio_number', To)
      .eq('user_phone', From)
      .maybeSingle();

    if (!mapping) {
      await updateLog(supabase, logId, 'failed', 'No phone mapping found');
      return twiml();
    }

    // sender_id: set if internal PadMagnet user, NULL if external agent
    const senderId = mapping.user_id || null;

    // Insert the reply message
    const { data: message } = await supabase
      .from('messages')
      .insert({
        conversation_id: mapping.conversation_id,
        sender_id: senderId,
        body: Body,
        channel: 'sms',
        external_id: MessageSid,
        delivery_status: 'delivered',
        from_phone: From,
        to_phone: To,
      })
      .select('id')
      .single();

    // Fetch conversation to determine which side gets the unread bump
    const { data: conv } = await supabase
      .from('conversations')
      .select('tenant_user_id, owner_user_id, conversation_type')
      .eq('id', mapping.conversation_id)
      .single();

    if (conv.conversation_type === 'external_agent') {
      // External agent replied — always increment tenant's unread
      await supabase.rpc('increment_unread', {
        p_conversation_id: mapping.conversation_id,
        p_role: 'tenant',
      });
    } else {
      // Internal conversation — increment the other party's unread
      const recipientRole = senderId === conv.tenant_user_id ? 'owner' : 'tenant';
      await supabase.rpc('increment_unread', {
        p_conversation_id: mapping.conversation_id,
        p_role: recipientRole,
      });
    }

    // Update conversation preview text
    await supabase
      .from('conversations')
      .update({ last_message_text: Body.slice(0, 200) })
      .eq('id', mapping.conversation_id);

    await updateLog(supabase, logId, 'processed', null, mapping.conversation_id, message?.id);
    return twiml();
  } catch (err) {
    console.error('Twilio webhook error:', err);
    if (logId) await updateLog(supabase, logId, 'failed', err.message);
    return twiml();
  }
}

/** Return a TwiML response. Empty = no auto-reply. */
function twiml(message) {
  const body = message
    ? `<Response><Message>${message}</Message></Response>`
    : '<Response/>';
  return new Response(body, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

async function updateLog(supabase, id, status, error, conversationId, messageId) {
  if (!id) return;
  const update = { status };
  if (error) update.error_message = error;
  if (conversationId) update.conversation_id = conversationId;
  if (messageId) update.message_id = messageId;
  await supabase.from('webhook_logs').update(update).eq('id', id);
}
