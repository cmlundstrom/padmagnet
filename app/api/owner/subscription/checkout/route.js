import Stripe from 'stripe';
import { createServiceClient } from '../../../../../lib/supabase';
import { getAuthUser } from '../../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Tier pass Price IDs
const TIER_PRICES = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_1TDc0LIpjiZxeVpLmQv4fGt6',
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1TDc1jIpjiZxeVpLGHDgQfu7',
};

// POST — create Stripe Checkout session for a tier pass (one-time, 30 days)
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
      return NextResponse.json({ error: 'Invalid tier. Must be "pro" or "premium".' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check current tier — don't allow buying same or lower tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name, email, tier, tier_expires_at')
      .eq('id', user.id)
      .single();

    const currentTier = profile?.tier || 'free';
    const tierOrder = { free: 0, pro: 1, premium: 2 };

    if (tierOrder[tier] <= tierOrder[currentTier] && profile?.tier_expires_at && new Date(profile.tier_expires_at) > new Date()) {
      return NextResponse.json({ error: `You already have an active ${currentTier} pass.` }, { status: 400 });
    }

    // Find or create Stripe Customer
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.display_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create one-time checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: TIER_PRICES[tier], quantity: 1 }],
      success_url: `https://padmagnet.com/email-confirmed?type=payment&status=complete&tier=${tier}`,
      cancel_url: `https://padmagnet.com/email-confirmed?type=payment&status=cancelled`,
      metadata: {
        type: 'tier_pass',
        tier,
        user_id: user.id,
      },
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error('Tier checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
