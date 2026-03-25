import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Stripe sends raw body — Next.js App Router handles this with request.text()
export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    // Log failure to webhook_logs for admin visibility
    try {
      const sb = createServiceClient();
      await sb.from('webhook_logs').insert({
        source: 'stripe',
        event_type: 'signature_verification_failed',
        status: 'error',
        payload: { error: err.message },
      });
    } catch (_) {}
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata || {};

        // --- Tier pass purchase (Pro/Premium 30-day pass) ---
        if (metadata.type === 'tier_pass') {
          const { tier, user_id } = metadata;
          if (tier && user_id) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            await supabase
              .from('profiles')
              .update({
                tier,
                tier_started_at: now.toISOString(),
                tier_expires_at: expiresAt.toISOString(),
                stripe_customer_id: session.customer || undefined,
              })
              .eq('id', user_id);

            // Record payment for revenue tracking
            const tierAmount = session.amount_total || 0;
            if (tierAmount > 0) {
              await supabase.from('payments').insert({
                owner_user_id: user_id,
                stripe_payment_intent_id: session.payment_intent,
                amount_cents: tierAmount,
                status: 'succeeded',
                purchase_type: 'tier_pass',
                method: session.payment_method_types?.[0] || 'card',
              }).catch(() => {});

              // Ledger entry for revenue
              await supabase.from('ledger_entries').insert({
                owner_user_id: user_id,
                entry_type: 'revenue',
                reference_type: 'tier_pass',
                amount_cents: tierAmount,
                description: `${tier} pass (30-day)`,
              }).catch(() => {});
            }

            // Log to webhook_logs for admin visibility
            await supabase.from('webhook_logs').insert({
              source: 'stripe',
              event_type: 'tier_pass_activated',
              external_id: session.id,
              status: 'processed',
              payload: { tier, user_id, amount_cents: tierAmount, expires_at: expiresAt.toISOString() },
            }).catch(() => {});

            console.log(`Tier pass activated: ${tier} for user ${user_id}, expires ${expiresAt.toISOString()}`);
          }
          break;
        }

        // --- Legacy listing purchase flow ---
        const { listing_id, owner_user_id, product_ids: productIdsJson } = metadata;

        if (!listing_id || !owner_user_id) {
          console.warn('Checkout session missing metadata:', session.id);
          break;
        }

        const productIds = JSON.parse(productIdsJson || '[]');

        // Fetch products to determine what was purchased
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        const totalCents = (products || []).reduce((sum, p) => sum + p.price_cents, 0);
        const hasBoost = (products || []).some(p => p.name.toLowerCase().includes('boost'));
        const hasListing = (products || []).some(p => p.name.toLowerCase().includes('listing'));

        // Create invoice (paid)
        const { data: invoice } = await supabase
          .from('invoices')
          .insert({
            owner_user_id,
            product_id: productIds[0],
            listing_id,
            stripe_invoice_id: session.invoice || session.id,
            amount_cents: totalCents,
            status: 'paid',
            purchase_type: hasBoost ? 'boost' : 'listing',
            paid_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        // Create payment record
        const { data: payment } = await supabase
          .from('payments')
          .insert({
            owner_user_id,
            invoice_id: invoice?.id,
            product_id: productIds[0],
            listing_id,
            stripe_payment_intent_id: session.payment_intent,
            amount_cents: totalCents,
            status: 'succeeded',
            purchase_type: hasBoost ? 'boost' : 'listing',
            method: session.payment_method_types?.[0] || 'card',
          })
          .select('id')
          .single();

        // Create ledger entry (revenue)
        await supabase.from('ledger_entries').insert({
          owner_user_id,
          invoice_id: invoice?.id,
          payment_id: payment?.id,
          product_id: productIds[0],
          listing_id,
          entry_type: 'revenue',
          reference_type: 'owner_purchase',
          amount_cents: totalCents,
          description: (products || []).map(p => p.name).join(' + '),
        });

        // Create owner_purchases record
        for (const pid of productIds) {
          await supabase.from('owner_purchases').insert({
            owner_user_id,
            product_id: pid,
            listing_id,
            invoice_id: invoice?.id,
            stripe_checkout_session_id: session.id,
            stripe_customer_id: session.customer,
          });
        }

        // Update listing: activate + set expiration
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

        const listingUpdate = {
          status: 'active',
          is_active: true,
          expires_at: expiresAt.toISOString(),
        };

        if (hasBoost) {
          listingUpdate.is_boosted = true;
          listingUpdate.boosted_until = expiresAt.toISOString();
        }

        await supabase
          .from('listings')
          .update(listingUpdate)
          .eq('id', listing_id);

        // Save stripe_customer_id on profile for future payments
        if (session.customer) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', owner_user_id);
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const { listing_id, owner_user_id } = intent.metadata || {};

        if (listing_id && owner_user_id) {
          await supabase.from('payments').insert({
            owner_user_id,
            listing_id,
            stripe_payment_intent_id: intent.id,
            amount_cents: intent.amount,
            status: 'failed',
            failure_reason: intent.last_payment_error?.message,
          });
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
