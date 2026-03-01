import { createServiceClient } from '../../../lib/supabase';
import { getAuthUser } from '../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`tenant_user_id.eq.${user.id},owner_user_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
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

    const body = await request.json();
    const { listing_id, initial_message } = body;

    if (!listing_id || !initial_message) {
      return NextResponse.json({ error: 'listing_id and initial_message are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch listing for denormalized fields
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, street_number, street_name, city, photos, owner_user_id, listing_agent_email')
      .eq('id', listing_id)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if conversation already exists for this user + listing
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('tenant_user_id', user.id)
      .eq('listing_id', listing_id)
      .single();

    if (existing) {
      // Add message to existing conversation
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: existing.id,
        sender_id: user.id,
        body: initial_message,
      });

      if (msgErr) {
        return NextResponse.json({ error: msgErr.message }, { status: 500 });
      }

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message_text: initial_message,
          last_message_at: new Date().toISOString(),
          owner_unread_count: supabase.rpc ? 1 : 1, // increment would need RPC
        })
        .eq('id', existing.id);

      return NextResponse.json({ id: existing.id, existing: true });
    }

    // Create new conversation
    const address = [listing.street_number, listing.street_name, listing.city].filter(Boolean).join(' ');
    const firstPhoto = listing.photos?.[0]?.url || null;

    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .insert({
        listing_id,
        tenant_user_id: user.id,
        owner_user_id: listing.owner_user_id || null,
        listing_address: address,
        listing_photo_url: firstPhoto,
        last_message_text: initial_message,
        last_message_at: new Date().toISOString(),
        owner_unread_count: 1,
      })
      .select()
      .single();

    if (convoErr) {
      return NextResponse.json({ error: convoErr.message }, { status: 500 });
    }

    // Create first message
    await supabase.from('messages').insert({
      conversation_id: convo.id,
      sender_id: user.id,
      body: initial_message,
    });

    return NextResponse.json(convo, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
