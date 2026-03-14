/**
 * Resend Inbound Email Webhook
 *
 * Receives email replies from both PadMagnet users and external MLS agents.
 * Routes them into the correct conversation via reply-to address parsing:
 *   conv-{uuid}@inbound.padmagnet.com
 *
 * External agents have sender_id = NULL in messages.
 */

import { Webhook } from 'svix';
import { Resend } from 'resend';
import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let _wh;
function getWebhookVerifier() {
  if (!_wh) _wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
  return _wh;
}

export async function POST(request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServiceClient();
  let logId = null;

  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Verify svix signature
    getWebhookVerifier().verify(rawBody, {
      'svix-id': request.headers.get('svix-id'),
      'svix-timestamp': request.headers.get('svix-timestamp'),
      'svix-signature': request.headers.get('svix-signature'),
    });

    // Log every webhook event
    const { data: log } = await supabase
      .from('webhook_logs')
      .insert({
        source: 'resend',
        event_type: body.type,
        external_id: body.data?.email_id,
        payload: body,
      })
      .select('id')
      .single();
    logId = log?.id;

    // Only process inbound email events
    if (body.type !== 'email.received') {
      await updateLog(supabase, logId, 'processed');
      return NextResponse.json({ ok: true });
    }

    const { data } = body;

    // Fetch full email content via Resend API
    const fullEmail = await resend.emails.get(data.email_id);
    const rawText = fullEmail.data?.text || '';
    const cleanBody = stripReplyChain(rawText);

    if (!cleanBody.trim()) {
      await updateLog(supabase, logId, 'processed', 'Empty reply body after stripping');
      return NextResponse.json({ ok: true });
    }

    // Parse conversation ID from To address: conv-{uuid}@inbound.padmagnet.com
    const toAddr = Array.isArray(data.to) ? data.to[0] : data.to;
    const convMatch = toAddr?.match(/conv-([a-f0-9-]{36})@/i);
    if (!convMatch) {
      await updateLog(supabase, logId, 'failed', `Could not parse conversation ID from: ${toAddr}`);
      return NextResponse.json({ error: 'Unknown recipient' }, { status: 400 });
    }
    const conversationId = convMatch[1];

    // Dedup — prevent double-insertion from duplicate webhooks
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('external_id', data.email_id)
      .maybeSingle();

    if (existing) {
      await updateLog(supabase, logId, 'duplicate');
      return NextResponse.json({ ok: true });
    }

    // Look up conversation + verify sender is participant OR external agent
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, tenant_user_id, owner_user_id, conversation_type, external_agent_email')
      .eq('id', conversationId)
      .single();

    if (!conv) {
      await updateLog(supabase, logId, 'failed', 'Conversation not found');
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Extract sender email from Resend payload
    const senderEmail = typeof data.from === 'string'
      ? data.from
      : data.from?.email || data.from?.[0];
    let senderId = null;

    // Check 1: Is sender a PadMagnet participant?
    const participantIds = [conv.tenant_user_id, conv.owner_user_id].filter(Boolean);
    if (participantIds.length > 0) {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', senderEmail)
        .in('id', participantIds)
        .maybeSingle();
      if (senderProfile) senderId = senderProfile.id;
    }

    // Check 2: Is sender an external agent for this conversation?
    const isExternalAgent = !senderId
      && conv.conversation_type === 'external_agent'
      && conv.external_agent_email
      && senderEmail.toLowerCase() === conv.external_agent_email.toLowerCase();

    if (!senderId && !isExternalAgent) {
      await updateLog(supabase, logId, 'failed', `Sender ${senderEmail} not a participant or recognized agent`);
      return NextResponse.json({ error: 'Unauthorized sender' }, { status: 403 });
    }

    // Insert message — sender_id is NULL for external agent replies
    const { data: message } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        body: cleanBody,
        channel: 'email',
        external_id: data.email_id,
        delivery_status: 'delivered',
        from_email: senderEmail,
      })
      .select('id')
      .single();

    // Increment unread for the appropriate party
    if (isExternalAgent) {
      // External agent replied — always increment tenant's unread
      await supabase.rpc('increment_unread', {
        p_conversation_id: conversationId,
        p_role: 'tenant',
      });
    } else {
      const recipientRole = senderId === conv.tenant_user_id ? 'owner' : 'tenant';
      await supabase.rpc('increment_unread', {
        p_conversation_id: conversationId,
        p_role: recipientRole,
      });
    }

    // Update conversation preview
    await supabase
      .from('conversations')
      .update({ last_message_text: cleanBody.slice(0, 200) })
      .eq('id', conversationId);

    await updateLog(supabase, logId, 'processed', null, conversationId, message?.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Resend webhook error:', err);
    if (logId) await updateLog(supabase, logId, 'failed', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Strip reply chain / forwarded content from email body.
 * Keeps only the new reply text above common email markers.
 */
function stripReplyChain(text) {
  const markers = [
    /\n\s*On .+ wrote:\s*$/ms,
    /\n\s*-{2,}\s*Original Message/mi,
    /\n\s*>{1,}/m,
    /\n\s*From:\s+/m,
    /\n\s*Sent from my /m,
    /\n\s*--\s*\n/m,
  ];
  let clean = text;
  for (const marker of markers) {
    const match = clean.match(marker);
    if (match) clean = clean.slice(0, match.index);
  }
  return clean.trim();
}

async function updateLog(supabase, id, status, error, conversationId, messageId) {
  if (!id) return;
  const update = { status };
  if (error) update.error_message = error;
  if (conversationId) update.conversation_id = conversationId;
  if (messageId) update.message_id = messageId;
  await supabase.from('webhook_logs').update(update).eq('id', id);
}
