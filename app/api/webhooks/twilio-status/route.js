/**
 * Twilio Delivery Status Webhook
 *
 * Receives status callbacks for outbound SMS messages.
 * Updates delivery_status on the messages table and
 * marks delivery queue entries accordingly.
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
    const { MessageSid, MessageStatus } = params;

    // Log every status callback
    const { data: log } = await supabase
      .from('webhook_logs')
      .insert({
        source: 'twilio',
        event_type: `status_${MessageStatus}`,
        external_id: MessageSid,
        payload: params,
      })
      .select('id')
      .single();
    logId = log?.id;

    // Validate signature
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-status`;
    if (!validateTwilioSignature(request, url, params)) {
      await updateLog(supabase, logId, 'failed', 'Invalid signature');
      return new Response('Forbidden', { status: 403 });
    }

    // Map Twilio status to our delivery_status enum
    const statusMap = {
      queued: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
    };
    const deliveryStatus = statusMap[MessageStatus] || 'sent';

    // Update the message record
    await supabase
      .from('messages')
      .update({ delivery_status: deliveryStatus })
      .eq('external_id', MessageSid);

    // Update delivery queue if entry exists
    const { data: msg } = await supabase
      .from('messages')
      .select('id')
      .eq('external_id', MessageSid)
      .maybeSingle();

    if (msg) {
      if (deliveryStatus === 'delivered' || deliveryStatus === 'sent') {
        await supabase
          .from('message_delivery_queue')
          .update({ status: 'sent' })
          .eq('message_id', msg.id)
          .eq('channel', 'sms')
          .eq('status', 'pending');
      } else if (deliveryStatus === 'failed') {
        await supabase
          .from('message_delivery_queue')
          .update({
            last_error: `Twilio status: ${MessageStatus}`,
            updated_at: new Date().toISOString(),
          })
          .eq('message_id', msg.id)
          .eq('channel', 'sms');
      }
    }

    await updateLog(supabase, logId, 'processed');
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Twilio status webhook error:', err);
    if (logId) await updateLog(supabase, logId, 'failed', err.message);
    return new Response('Error', { status: 500 });
  }
}

async function updateLog(supabase, id, status, error) {
  if (!id) return;
  const update = { status };
  if (error) update.error_message = error;
  await supabase.from('webhook_logs').update(update).eq('id', id);
}
