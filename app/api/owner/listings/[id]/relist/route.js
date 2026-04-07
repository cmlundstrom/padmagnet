import { createServiceClient } from '../../../../../../lib/supabase';
import { getAuthUser } from '../../../../../../lib/auth-helpers';
import { writeAuditLogBatch } from '../../../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST — re-list a de-listed (leased) or expired owner listing
// If paid days remain from de-list, resumes free. Otherwise requires purchase.
export async function POST(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: listing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, source, status, days_remaining_at_delist, expires_at')
      .eq('id', id)
      .single();

    if (fetchErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.source !== 'owner' || listing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (!['leased', 'expired'].includes(listing.status)) {
      return NextResponse.json({ error: 'Only de-listed or expired listings can be re-listed' }, { status: 400 });
    }

    // Check if there are remaining paid days to resume
    const daysRemaining = listing.days_remaining_at_delist;

    if (daysRemaining && daysRemaining > 0) {
      // Free resume — extend expires_at from now by remaining days
      const newExpiresAt = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateErr } = await supabase
        .from('listings')
        .update({
          status: 'active',
          is_active: true,
          expires_at: newExpiresAt,
          days_remaining_at_delist: null,
        })
        .eq('id', id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await writeAuditLogBatch([{
        tableName: 'listings',
        rowId: id,
        action: 'relist',
        fieldChanged: 'status',
        oldValue: listing.status,
        newValue: 'active',
        metadata: { days_remaining: daysRemaining, triggered_by: 'owner' },
      }]).catch(() => {});

      return NextResponse.json({
        success: true,
        action: 'resumed',
        days_remaining: daysRemaining,
        expires_at: newExpiresAt,
      });
    }

    // No remaining days — needs purchase
    return NextResponse.json({
      success: false,
      action: 'payment_required',
      message: 'Your listing period has expired. Purchase a new 30-day pass to re-list.',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
