/**
 * Renter Tier Checkout — Stripe payment for Ask Pad Explorer ($1.50) or Pad Master ($3.50)
 */
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TIER_PRICES = {
  explorer: { amount: 150, label: 'Ask Pad Explorer' },
  master: { amount: 350, label: 'Pad Master + Verified Renter' },
};

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { tier } = await request.json();
    if (!tier || !TIER_PRICES[tier]) {
      return NextResponse.json({ error: 'Invalid tier. Must be "explorer" or "master".' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name, email')
      .eq('id', user.id)
      .single();

    // Find or create Stripe Customer
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.display_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const priceConfig = TIER_PRICES[tier];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PadMagnet ${priceConfig.label}`,
            description: tier === 'master'
              ? 'Unlimited Ask Pad queries, 3 search zones, Verified Renter badge'
              : '30 daily Ask Pad queries + rollover, 2 search zones',
          },
          unit_amount: priceConfig.amount,
        },
        quantity: 1,
      }],
      success_url: `https://padmagnet.com/payment-confirmed?status=complete&renter_tier=${tier}`,
      cancel_url: 'https://padmagnet.com/payment-confirmed?status=cancelled',
      metadata: {
        type: 'renter_tier',
        tier,
        user_id: user.id,
      },
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error('Renter tier checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
