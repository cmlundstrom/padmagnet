import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { notifyRecipient, notifyExternalAgent } from '../../../lib/notify';
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
    const tab = searchParams.get('tab') || 'all';

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`tenant_user_id.eq.${user.id},owner_user_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch owner display names for internal conversations
    const ownerIds = [...new Set((data || []).filter(c => c.owner_user_id).map(c => c.owner_user_id))];
    let ownerNames = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ownerIds);
      ownerNames = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]));
    }

    const flattened = (data || []).map(c => ({
      ...c,
      owner_display_name: c.owner_user_id ? (ownerNames[c.owner_user_id] || null) : null,
    }));

    // Per-user archive/unread filtering
    const filtered = flattened.filter(c => {
      const isTenant = c.tenant_user_id === user.id;
      const archived = isTenant ? c.archived_by_tenant : c.archived_by_owner;
      const unreadCount = isTenant ? c.tenant_unread_count : c.owner_unread_count;
      const lastReadAt = isTenant ? c.tenant_last_read_at : c.owner_last_read_at;

      switch (tab) {
        case 'unread':
          return !archived && (
            unreadCount > 0 ||
            (c.last_message_at && (!lastReadAt || new Date(c.last_message_at) > new Date(lastReadAt)))
          );
        case 'archived':
          return archived === true;
        case 'all':
        default:
          return !archived;
      }
    });

    return NextResponse.json(filtered);
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

    const rl = await checkRateLimit('conversations', user.id);
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many conversations. Please slow down.' }, { status: 429, headers: rl.headers });
    }

    const body = await request.json();
    const { listing_id, initial_message } = body;

    if (!listing_id || !initial_message) {
      return NextResponse.json({ error: 'listing_id and initial_message are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch listing for denormalized fields + agent info
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, source, street_number, street_name, city, photos, owner_user_id, listing_agent_name, listing_agent_email, listing_agent_phone')
      .eq('id', listing_id)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if conversation already exists for this user + listing
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, conversation_type, owner_user_id, external_agent_name, external_agent_email, external_agent_phone, listing_address')
      .eq('tenant_user_id', user.id)
      .eq('listing_id', listing_id)
      .maybeSingle();

    if (existing) {
      // Add message to existing conversation
      const { data: msg, error: msgErr } = await supabase.from('messages').insert({
        conversation_id: existing.id,
        sender_id: user.id,
        body: initial_message,
        channel: 'in_app',
      }).select().single();

      if (msgErr) {
        return NextResponse.json({ error: msgErr.message }, { status: 500 });
      }

      // Update preview + atomic unread increment
      await supabase
        .from('conversations')
        .update({ last_message_text: initial_message })
        .eq('id', existing.id);

      if (existing.conversation_type === 'external_agent') {
        // No owner to increment unread for — notify external agent
        const { data: sender } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
        try {
          await notifyExternalAgent(
            { ...msg, sender_name: sender?.display_name || 'Someone' },
            existing
          );
        } catch (err) {
          console.error('External agent notification error:', err);
        }
      } else {
        await supabase.rpc('increment_unread', {
          p_conversation_id: existing.id,
          p_role: 'owner',
        });
      }

      return NextResponse.json({ id: existing.id, existing: true });
    }

    // Create new conversation
    const address = [listing.street_number, listing.street_name, listing.city].filter(Boolean).join(' ');
    const firstPhoto = listing.photos?.[0]?.url || null;
    const isExternalAgent = listing.source === 'mls';

    const conversationData = {
      listing_id,
      tenant_user_id: user.id,
      listing_address: address,
      listing_photo_url: firstPhoto,
      last_message_text: initial_message,
      last_message_at: new Date().toISOString(),
    };

    if (isExternalAgent) {
      // IDX/MLS listing — agent is external, no PadMagnet account
      conversationData.conversation_type = 'external_agent';
      conversationData.owner_user_id = null;
      conversationData.external_agent_name = listing.listing_agent_name || null;
      conversationData.external_agent_email = listing.listing_agent_email || null;
      conversationData.external_agent_phone = listing.listing_agent_phone || null;
    } else {
      // Owner listing — standard internal conversation
      conversationData.conversation_type = 'internal_owner';
      conversationData.owner_user_id = listing.owner_user_id || null;
      conversationData.owner_unread_count = 1;
    }

    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (convoErr) {
      return NextResponse.json({ error: convoErr.message }, { status: 500 });
    }

    // Create first message
    const { data: firstMsg } = await supabase.from('messages').insert({
      conversation_id: convo.id,
      sender_id: user.id,
      body: initial_message,
      channel: 'in_app',
    }).select().single();

    // Send notification for the initial message
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    const senderName = sender?.display_name || 'Someone';

    if (isExternalAgent) {
      // No phone_mappings for external agents — email only (no SMS routing)
      try {
        await notifyExternalAgent(
          { ...firstMsg, sender_name: senderName },
          convo
        );
      } catch (err) {
        console.error('External agent notification error:', err);
      }
    } else if (convo.owner_user_id) {
      const { data: recipient } = await supabase
        .from('profiles')
        .select('id, email, phone, display_name, preferred_channel, sms_consent, expo_push_token')
        .eq('id', convo.owner_user_id)
        .single();

      if (recipient) {
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
            { ...firstMsg, sender_name: senderName },
            convo,
            recipient
          );
        } catch (err) {
          console.error('Notification error:', err);
        }
      }
    }

    return NextResponse.json(convo, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
