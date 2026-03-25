import { createServiceClient } from '../../../../lib/supabase';
import { sendTemplateEmail } from '../../../../lib/email';
import { writeAuditLogBatch } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/admin/refund — issue a refund for an owner payment
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { owner_user_id, payment_id, amount_cents, reason } = await request.json();

    if (!owner_user_id || !payment_id) {
      return NextResponse.json({ error: 'owner_user_id and payment_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch the payment record
    const { data: payment, error: fetchErr } = await supabase
      .from('payments')
      .select('*, invoices(listing_id, listings(street_number, street_name, city))')
      .eq('id', payment_id)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'refunded') {
      return NextResponse.json({ error: 'Payment already refunded' }, { status: 400 });
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'No Stripe payment intent found for this payment' }, { status: 400 });
    }

    // Issue Stripe refund
    const refundParams = {
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
    };
    if (amount_cents && amount_cents < payment.amount_cents) {
      refundParams.amount = amount_cents;
    }

    const refund = await stripe.refunds.create(refundParams);

    const refundedAmount = refund.amount;

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', payment_id);

    // Create ledger entry
    await supabase.from('ledger_entries').insert({
      owner_user_id,
      entry_type: 'refund',
      amount_cents: -refundedAmount,
      reference_type: 'refund',
      reference_id: payment_id,
      notes: reason || 'Admin-initiated refund',
    });

    // Audit log
    await writeAuditLogBatch([{
      tableName: 'payments',
      rowId: payment_id,
      action: 'refund',
      fieldChanged: 'status',
      oldValue: payment.status,
      newValue: 'refunded',
      metadata: { stripe_refund_id: refund.id, amount_cents: refundedAmount, reason },
    }]);

    // Send refund confirmation email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', owner_user_id)
      .single();

    if (profile?.email) {
      const listing = payment.invoices?.listings;
      const address = listing
        ? [listing.street_number, listing.street_name, listing.city].filter(Boolean).join(', ')
        : 'N/A';

      sendTemplateEmail('refund_confirmation', profile.email, {
        owner_name: profile.display_name || 'Property Owner',
        amount: `$${(refundedAmount / 100).toFixed(2)}`,
        listing_address: address,
        reason: reason || 'Requested refund',
        refund_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      stripe_refund_id: refund.id,
      amount_cents: refundedAmount,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
