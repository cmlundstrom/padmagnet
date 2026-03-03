import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST — renew an expired listing using saved payment method
export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { listing_id } = await request.json();
    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify listing ownership
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, source')
      .eq('id', listing_id)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.owner_user_id !== user.id || listing.source !== 'owner') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get basic listing product
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .ilike('name', '%listing%')
      .order('sort_order')
      .limit(1)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'No listing product found' }, { status: 500 });
    }

    // Get saved Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No saved payment method. Please use checkout.' }, { status: 400 });
    }

    // Get default payment method
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    const paymentMethodId = customer.invoice_settings?.default_payment_method
      || customer.default_source;

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'No saved payment method. Please use checkout.' }, { status: 400 });
    }

    // Charge the saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price_cents,
      currency: 'usd',
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        listing_id,
        owner_user_id: user.id,
        renewal: 'true',
      },
    });

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    // Update listing
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await supabase
      .from('listings')
      .update({
        status: 'active',
        is_active: true,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', listing_id);

    // Write billing records
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        owner_user_id: user.id,
        product_id: product.id,
        listing_id,
        amount_cents: product.price_cents,
        status: 'paid',
        purchase_type: 'listing',
        paid_at: now.toISOString(),
      })
      .select('id')
      .single();

    const { data: payment } = await supabase
      .from('payments')
      .insert({
        owner_user_id: user.id,
        invoice_id: invoice?.id,
        product_id: product.id,
        listing_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: product.price_cents,
        status: 'succeeded',
        purchase_type: 'listing',
        method: 'card',
      })
      .select('id')
      .single();

    await supabase.from('ledger_entries').insert({
      owner_user_id: user.id,
      invoice_id: invoice?.id,
      payment_id: payment?.id,
      product_id: product.id,
      listing_id,
      entry_type: 'revenue',
      reference_type: 'owner_purchase',
      amount_cents: product.price_cents,
      description: `Renewal: ${product.name}`,
    });

    await supabase.from('owner_purchases').insert({
      owner_user_id: user.id,
      product_id: product.id,
      listing_id,
      invoice_id: invoice?.id,
      stripe_customer_id: profile.stripe_customer_id,
    });

    return NextResponse.json({ success: true, expires_at: expiresAt.toISOString() });
  } catch (err) {
    console.error('Renewal error:', err);

    // Handle card requires authentication
    if (err.code === 'authentication_required') {
      return NextResponse.json({ error: 'Card requires authentication. Please use checkout.' }, { status: 402 });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
