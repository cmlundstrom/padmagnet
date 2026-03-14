/**
 * Delivery Retry Cron
 *
 * Processes failed message deliveries from the message_delivery_queue.
 * Runs every 5 minutes via Vercel Cron.
 *
 * Picks up pending items where next_attempt_at <= now and attempts < max_attempts.
 * Retries the delivery, then marks sent or bumps to next attempt with exponential backoff.
 * Items that exceed max_attempts are marked 'failed' permanently.
 */

import { createServiceClient } from '../../../../lib/supabase';
import { sendSMS } from '../../../../lib/sms';
import { sendNotificationEmail, sendExternalAgentEmail } from '../../../../lib/email';
import { sendPushNotification } from '../../../../lib/push';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 20;

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Fetch pending items ready for retry
    const { data: items, error } = await supabase
      .from('message_delivery_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ processed: 0, succeeded: 0, failed: 0 });
    }

    for (const item of items) {
      processed++;

      // Mark as processing to prevent double-pickup
      await supabase
        .from('message_delivery_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('status', 'pending'); // Optimistic lock

      try {
        await deliverItem(supabase, item);
        succeeded++;

        // Mark as sent
        await supabase
          .from('message_delivery_queue')
          .update({
            status: 'sent',
            attempts: item.attempts + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      } catch (err) {
        const newAttempts = item.attempts + 1;

        if (newAttempts >= item.max_attempts) {
          // Permanently failed
          failed++;
          await supabase
            .from('message_delivery_queue')
            .update({
              status: 'failed',
              attempts: newAttempts,
              last_error: err.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        } else {
          // Schedule next retry with exponential backoff: 2min, 8min, 32min...
          const backoffMs = Math.pow(4, newAttempts) * 30 * 1000;
          await supabase
            .from('message_delivery_queue')
            .update({
              status: 'pending',
              attempts: newAttempts,
              last_error: err.message,
              next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }
      }
    }

    return NextResponse.json({ processed, succeeded, failed });
  } catch (err) {
    console.error('Delivery retry cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Re-attempt delivery for a single queue item.
 * Uses the same channel-specific logic as notify.js but without re-enqueue.
 */
async function deliverItem(supabase, item) {
  const { channel, payload, message_id } = item;

  if (channel === 'sms') {
    const body = payload.isExternalAgent
      ? `Hi ${payload.agent_name}, a renter on PadMagnet is interested in ${payload.listing_address}. They said: "${payload.message_preview}" — Reply to this text to respond.`
      : `PadMagnet: New message about ${payload.listing_address} from ${payload.sender_name}. Reply here or open the app to respond.`;
    const { sid } = await sendSMS(payload.to, body);
    await supabase.from('messages').update({ external_id: sid, delivery_status: 'sent' }).eq('id', message_id);
  } else if (channel === 'email') {
    if (payload.isExternalAgent) {
      await sendExternalAgentEmail(payload);
    } else {
      await sendNotificationEmail(payload);
    }
  } else if (channel === 'push') {
    await sendPushNotification(payload.token, payload.title, payload.body, payload.data);
  }
}
