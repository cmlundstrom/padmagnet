import { createServiceClient } from '../../../../../../lib/supabase';
import { getAuthUser } from '../../../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/owner/listings/[id]/price — update listing price with history
export async function PUT(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id } = await params;
    const { price } = await request.json();

    // Validate price
    const newPrice = parseFloat(price);
    if (!newPrice || newPrice <= 0 || isNaN(newPrice)) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }

    if (newPrice > 999999) {
      return NextResponse.json({ error: 'Price exceeds maximum allowed value' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify ownership + get current price
    const { data: listing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, source, list_price, status')
      .eq('id', id)
      .single();

    if (fetchErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.source !== 'owner' || listing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ error: 'Can only edit price on active listings' }, { status: 400 });
    }

    const oldPrice = listing.list_price;

    if (parseFloat(oldPrice) === newPrice) {
      return NextResponse.json({ error: 'New price is the same as current price' }, { status: 400 });
    }

    // Update price
    const { data: updated, error: updateErr } = await supabase
      .from('listings')
      .update({ list_price: newPrice })
      .eq('id', id)
      .select('id, list_price')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Insert price history record
    const { error: historyErr } = await supabase
      .from('listing_price_history')
      .insert({
        listing_id: id,
        changed_by: user.id,
        old_price: oldPrice,
        new_price: newPrice,
      });

    if (historyErr) {
      console.error('Price history insert failed:', historyErr);
      // Non-critical — price update already succeeded
    }

    return NextResponse.json({
      id: updated.id,
      list_price: updated.list_price,
      old_price: oldPrice,
    });

  } catch (err) {
    console.error('Price update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
