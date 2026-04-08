import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { notifyRecipient, notifyExternalAgent } from '../../../lib/notify';
import { sanitizeText, hasExternalUrl } from '../../../lib/validate';
import { checkRateLimit } from '../../../lib/rate-limit';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify user is a participant
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('id, tenant_user_id, owner_user_id, conversation_type, tenant_last_read_at, owner_last_read_at')
      .eq('id', conversationId)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (convo.tenant_user_id !== user.id && convo.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Include counterparty's last_read_at for read receipt display
    const isTenant = convo.tenant_user_id === user.id;
    const counterpartyLastReadAt = isTenant
      ? convo.owner_last_read_at
      : convo.tenant_last_read_at;

    return NextResponse.json({
      messages: messages || [],
      conversation_type: convo.conversation_type,
      counterparty_last_read_at: counterpartyLastReadAt,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const rl = await checkRateLimit('messages', user.id);
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many messages. Please slow down.' }, { status: 429, headers: rl.headers });
    }

    const body = await request.json();
    const { conversation_id, body: rawBody } = body;

    if (!conversation_id || !rawBody) {
      return NextResponse.json({ error: 'conversation_id and body are required' }, { status: 400 });
    }

    // Sanitize message body — strip HTML tags, enforce max length
    const messageBody = sanitizeText(rawBody, 5000);
    if (!messageBody) {
      return NextResponse.json({ error: 'Message body cannot be empty' }, { status: 400 });
    }

    // Flag messages containing external URLs for review
    const flagged = hasExternalUrl(messageBody);

    const supabase = createServiceClient();

    // Verify user is a participant
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('id, tenant_user_id, owner_user_id, conversation_type, listing_address, external_agent_name, external_agent_email, external_agent_phone')
      .eq('id', conversation_id)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (convo.tenant_user_id !== user.id && convo.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Insert message — delivery_status starts as 'pending' until notification is sent
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        body: messageBody,
        channel: 'in_app',
        delivery_status: 'pending',
        ...(flagged ? { flagged_external_url: true } : {}),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update conversation preview text (truncated for preview)
    await supabase
      .from('conversations')
      .update({ last_message_text: messageBody.slice(0, 200) })
      .eq('id', conversation_id);

    // Atomic unread increment (replaces manual fetch-then-update)
    const recipientRole = convo.tenant_user_id === user.id ? 'owner' : 'tenant';
    // For external_agent convos, there's no owner — but tenant_unread
    // only gets incremented when the agent replies (via webhook), not here
    if (convo.conversation_type !== 'external_agent' || recipientRole !== 'owner') {
      await supabase.rpc('increment_unread', {
        p_conversation_id: conversation_id,
        p_role: recipientRole,
      });
    }

    // Fetch sender name for notifications
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    const senderName = sender?.display_name || 'Someone';

    // Route notification based on conversation type
    console.log('[Messages] Routing notification:', { type: convo.conversation_type, owner: convo.owner_user_id, sender: user.id });
    // Debug breadcrumb — traces notification flow via DB
    await supabase.from('webhook_logs').insert({
      source: 'debug',
      event_type: 'notify_attempt',
      payload: { type: convo.conversation_type, owner: convo.owner_user_id, sender: user.id, message_id: message.id },
    });
    if (convo.conversation_type === 'external_agent') {
      // External MLS agent — email only, no phone_mappings, no push
      try {
        await notifyExternalAgent(
          { ...message, sender_name: senderName },
          convo
        );
      } catch (err) {
        console.error('External agent notification error:', err);
      }

    } else if (convo.owner_user_id) {
      // Internal owner — standard PadMagnet user flow
      const recipientId = user.id === convo.tenant_user_id
        ? convo.owner_user_id
        : convo.tenant_user_id;

      const { data: recipient } = await supabase
        .from('profiles')
        .select('id, email, phone, display_name, preferred_channel, sms_consent, expo_push_token')
        .eq('id', recipientId)
        .single();

      console.log('[Messages] Recipient:', recipient ? { id: recipient.id, email: recipient.email, channel: recipient.preferred_channel } : 'NOT FOUND');
      if (recipient) {
        // Upsert phone mapping for SMS reply routing
        if (recipient.preferred_channel === 'sms' && recipient.phone) {
          await supabase.from('phone_mappings').upsert({
            twilio_number: process.env.TWILIO_PHONE_NUMBER,
            user_phone: recipient.phone,
            conversation_id: convo.id,
            user_id: recipient.id,
          }, { onConflict: 'twilio_number,user_phone' });
        }

        try {
          await notifyRecipient(
            { ...message, sender_name: senderName },
            convo,
            recipient
          );
        } catch (err) {
          console.error('Notification error:', err);
        }
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
