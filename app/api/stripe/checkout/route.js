import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST — create Stripe Checkout session for listing purchase
export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { listing_id, product_ids } = await request.json();

    if (!listing_id || !product_ids?.length) {
      return NextResponse.json({ error: 'listing_id and product_ids required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify listing ownership
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, street_name, city')
      .eq('id', listing_id)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Fetch products
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)
      .eq('is_active', true);

    if (prodErr || !products?.length) {
      return NextResponse.json({ error: 'No valid products found' }, { status: 400 });
    }

    // Find or create Stripe Customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name, email')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.display_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Save customer ID for future one-click payments
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Build line items
    const lineItems = products.map(product => {
      if (product.stripe_price_id) {
        return { price: product.stripe_price_id, quantity: 1 };
      }
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description || undefined,
          },
          unit_amount: product.price_cents,
        },
        quantity: 1,
      };
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://padmagnet.com'}/dashboard/listings?success=true&listing_id=${listing_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://padmagnet.com'}/dashboard/listings?cancelled=true`,
      metadata: {
        listing_id,
        owner_user_id: user.id,
        product_ids: JSON.stringify(product_ids),
      },
      payment_intent_data: {
        metadata: {
          listing_id,
          owner_user_id: user.id,
        },
      },
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
