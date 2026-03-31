import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLogBatch } from '../../../../lib/api-helpers';
import { sendTemplateEmail } from '../../../../lib/email';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/renter-actions
 *
 * Unified endpoint for all admin actions on renter profiles.
 * Body: { action, user_id, ...params }
 *
 * Actions: gift_points, gift_queries, upgrade_tier, downgrade_tier,
 *          clear_cooldown, refund_renter
 */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { action, user_id, reason } = body;

    if (!action || !user_id) {
      return NextResponse.json({ error: 'action and user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch current profile
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'Renter not found' }, { status: 404 });
    }

    if (profile.role !== 'tenant') {
      return NextResponse.json({ error: 'User is not a renter' }, { status: 400 });
    }

    let result = {};
    const auditEntries = [];

    switch (action) {
      // ── Gift PadPoints ──────────────────────────────────
      case 'gift_points': {
        const { amount } = body;
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });
        }

        const newPoints = (profile.padpoints || 0) + amount;
        await supabase.from('profiles').update({ padpoints: newPoints }).eq('id', user_id);

        auditEntries.push({
          tableName: 'profiles', rowId: user_id, action: 'gift_points',
          fieldChanged: 'padpoints', oldValue: profile.padpoints, newValue: newPoints,
          metadata: { amount, reason: reason || 'Admin gift' },
        });

        result = { padpoints: newPoints };
        break;
      }

      // ── Gift Ask Pad Queries ────────────────────────────
      case 'gift_queries': {
        const { amount } = body;
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });
        }

        const newRollover = (profile.agent_queries_rollover || 0) + amount;
        await supabase.from('profiles').update({ agent_queries_rollover: newRollover }).eq('id', user_id);

        auditEntries.push({
          tableName: 'profiles', rowId: user_id, action: 'gift_queries',
          fieldChanged: 'agent_queries_rollover', oldValue: profile.agent_queries_rollover, newValue: newRollover,
          metadata: { amount, reason: reason || 'Admin gift' },
        });

        result = { agent_queries_rollover: newRollover };
        break;
      }

      // ── Upgrade Tier ────────────────────────────────────
      case 'upgrade_tier': {
        const { tier } = body;
        if (!['explorer', 'master'].includes(tier)) {
          return NextResponse.json({ error: 'tier must be explorer or master' }, { status: 400 });
        }

        const updates = { renter_tier: tier };
        if (tier === 'master') {
          updates.verified_renter = true;
          updates.search_zones_count = 3;
        } else if (tier === 'explorer') {
          updates.search_zones_count = Math.max(profile.search_zones_count || 1, 2);
        }

        await supabase.from('profiles').update(updates).eq('id', user_id);

        auditEntries.push({
          tableName: 'profiles', rowId: user_id, action: 'upgrade_tier',
          fieldChanged: 'renter_tier', oldValue: profile.renter_tier, newValue: tier,
          metadata: { updates, reason: reason || 'Admin upgrade' },
        });

        result = { renter_tier: tier, ...updates };
        break;
      }

      // ── Downgrade Tier ──────────────────────────────────
      case 'downgrade_tier': {
        const updates = {
          renter_tier: 'free',
          verified_renter: false,
          search_zones_count: 1,
        };

        await supabase.from('profiles').update(updates).eq('id', user_id);

        auditEntries.push({
          tableName: 'profiles', rowId: user_id, action: 'downgrade_tier',
          fieldChanged: 'renter_tier', oldValue: profile.renter_tier, newValue: 'free',
          metadata: { reason: reason || 'Admin downgrade' },
        });

        result = updates;
        break;
      }

      // ── Clear Cooldown ──────────────────────────────────
      case 'clear_cooldown': {
        const updates = {
          agent_cooldown_until: null,
          agent_abuse_score: 0,
        };

        await supabase.from('profiles').update(updates).eq('id', user_id);

        auditEntries.push({
          tableName: 'profiles', rowId: user_id, action: 'clear_cooldown',
          fieldChanged: 'agent_cooldown_until',
          oldValue: profile.agent_cooldown_until, newValue: null,
          metadata: {
            old_abuse_score: profile.agent_abuse_score,
            reason: reason || 'Admin cleared cooldown',
          },
        });

        result = updates;
        break;
      }

      // ── Refund Renter Tier Purchase ─────────────────────
      case 'refund_renter': {
        const { payment_id } = body;
        if (!payment_id) {
          return NextResponse.json({ error: 'payment_id required for refund' }, { status: 400 });
        }

        // Fetch the payment
        const { data: payment, error: payErr } = await supabase
          .from('payments')
          .select('*')
          .eq('id', payment_id)
          .eq('owner_user_id', user_id)
          .single();

        if (payErr || !payment) {
          return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        if (payment.status === 'refunded') {
          return NextResponse.json({ error: 'Payment already refunded' }, { status: 400 });
        }

        if (!payment.stripe_payment_intent_id) {
          return NextResponse.json({ error: 'No Stripe payment intent — cannot refund' }, { status: 400 });
        }

        // Issue Stripe refund
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          reason: 'requested_by_customer',
        });

        // Update payment status
        await supabase.from('payments').update({ status: 'refunded' }).eq('id', payment_id);

        // Ledger entry (negative)
        await supabase.from('ledger_entries').insert({
          owner_user_id: user_id,
          payment_id,
          entry_type: 'refund',
          reference_type: 'renter_tier_refund',
          amount_cents: -refund.amount,
          description: reason || 'Admin-initiated renter tier refund',
        });

        // Downgrade tier
        const tierUpdates = {
          renter_tier: 'free',
          verified_renter: false,
          search_zones_count: 1,
        };
        await supabase.from('profiles').update(tierUpdates).eq('id', user_id);

        auditEntries.push({
          tableName: 'payments', rowId: payment_id, action: 'refund',
          fieldChanged: 'status', oldValue: payment.status, newValue: 'refunded',
          metadata: { stripe_refund_id: refund.id, amount_cents: refund.amount, reason },
        }, {
          tableName: 'profiles', rowId: user_id, action: 'refund_downgrade',
          fieldChanged: 'renter_tier', oldValue: profile.renter_tier, newValue: 'free',
          metadata: { payment_id, reason },
        });

        // Send refund email
        if (profile.email) {
          sendTemplateEmail('refund_confirmation', profile.email, {
            owner_name: profile.display_name || 'Renter',
            amount: `$${(refund.amount / 100).toFixed(2)}`,
            listing_address: 'Ask Pad tier subscription',
            reason: reason || 'Requested refund',
            refund_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          }).catch(() => {});
        }

        result = { refunded: true, amount_cents: refund.amount, stripe_refund_id: refund.id };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Write audit log entries
    if (auditEntries.length > 0) {
      await writeAuditLogBatch(auditEntries);
    }

    return NextResponse.json({ ok: true, action, user_id, ...result });
  } catch (err) {
    console.error('Renter action error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
