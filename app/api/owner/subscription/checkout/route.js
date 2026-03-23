import Stripe from 'stripe';
import { createServiceClient } from '../../../../../lib/supabase';
import { getAuthUser } from '../../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Tier pass prices in cents (30-day passes)
const TIER_PRICE_CENTS = {
  pro: 499,
  premium: 999,
};

// POST — create Stripe Checkout session for a tier pass (one-time, 30 days)
// Prorates upgrade price when switching from a lower active tier
export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { tier } = await request.json();

    if (!tier || !TIER_PRICE_CENTS[tier]) {
      return NextResponse.json({ error: 'Invalid tier. Must be "pro" or "premium".' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name, email, tier, tier_expires_at')
      .eq('id', user.id)
      .single();

    const currentTier = profile?.tier || 'free';
    const tierOrder = { free: 0, pro: 1, premium: 2 };

    // Block same or lower tier if active
    if (tierOrder[tier] <= tierOrder[currentTier] && profile?.tier_expires_at && new Date(profile.tier_expires_at) > new Date()) {
      return NextResponse.json({ error: `You already have an active ${currentTier} pass.` }, { status: 400 });
    }

    // Calculate proration credit for upgrades (e.g., Pro → Premium)
    let chargeCents = TIER_PRICE_CENTS[tier];
    let creditCents = 0;
    let creditDescription = null;

    if (
      tierOrder[currentTier] > 0 &&
      tierOrder[tier] > tierOrder[currentTier] &&
      profile?.tier_expires_at
    ) {
      const now = new Date();
      const expiresAt = new Date(profile.tier_expires_at);
      const msRemaining = expiresAt.getTime() - now.getTime();

      if (msRemaining > 0) {
        const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
        const currentPriceCents = TIER_PRICE_CENTS[currentTier];
        // Credit = (unused days / 30) * price of current tier
        creditCents = Math.round((daysRemaining / 30) * currentPriceCents);
        chargeCents = Math.max(TIER_PRICE_CENTS[tier] - creditCents, 50); // Stripe min is $0.50
        creditDescription = `${Math.ceil(daysRemaining)} unused ${currentTier} days`;
      }
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

    // Build line item — use price_data so we can set the prorated amount
    const tierLabel = tier === 'pro' ? 'Pro' : 'Premium';
    const lineItem = {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `PadMagnet ${tierLabel} Pass — 30 Days`,
          description: creditCents > 0
            ? `Upgrade from ${currentTier}. $${(creditCents / 100).toFixed(2)} credit applied for ${creditDescription}.`
            : `Full access to all ${tierLabel} features for 30 days.`,
        },
        unit_amount: chargeCents,
      },
      quantity: 1,
    };

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [lineItem],
      success_url: `https://padmagnet.com/payment-confirmed?status=complete&tier=${tier}`,
      cancel_url: `https://padmagnet.com/payment-confirmed?status=cancelled`,
      metadata: {
        type: 'tier_pass',
        tier,
        user_id: user.id,
        credit_cents: String(creditCents),
        upgraded_from: creditCents > 0 ? currentTier : '',
      },
    });

    return NextResponse.json({
      checkout_url: session.url,
      charge_cents: chargeCents,
      credit_cents: creditCents,
      credit_description: creditDescription,
    });
  } catch (err) {
    console.error('Tier checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
