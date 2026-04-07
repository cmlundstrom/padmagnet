import { createServiceClient } from '../../../../../../lib/supabase';
import { getAuthUser } from '../../../../../../lib/auth-helpers';
import { writeAuditLogBatch } from '../../../../../../lib/api-helpers';
import { sendTemplateEmail } from '../../../../../../lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST — de-list an owner listing (tenant found, stop showing, preserve everything)
export async function POST(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: listing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, source, status, is_active, expires_at, created_at, street_number, street_name, city, state_or_province')
      .eq('id', id)
      .single();

    if (fetchErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.source !== 'owner' || listing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ error: 'Only active listings can be de-listed' }, { status: 400 });
    }

    // Calculate remaining days to preserve for re-list
    let daysRemaining = null;
    if (listing.expires_at) {
      const msRemaining = new Date(listing.expires_at).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    }

    // Fetch performance metrics
    const daysOnMarket = listing.created_at
      ? Math.max(1, Math.floor((Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const { count: uniqueViews } = await supabase
      .from('listing_views')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id);

    const { count: contacts } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id);

    // De-list the listing
    const { error: updateErr } = await supabase
      .from('listings')
      .update({
        status: 'leased',
        is_active: false,
        days_remaining_at_delist: daysRemaining,
      })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log
    await writeAuditLogBatch([{
      tableName: 'listings',
      rowId: id,
      action: 'delist',
      fieldChanged: 'status',
      oldValue: listing.status,
      newValue: 'leased',
      metadata: { days_remaining: daysRemaining, triggered_by: 'owner' },
    }]).catch(() => {});

    // Send de-list confirmation email
    const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
    const fullAddress = [address, listing.city, listing.state_or_province].filter(Boolean).join(', ');

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    sendTemplateEmail('listing_delisted', user.email, {
      owner_name: profile?.display_name || 'Property Owner',
      listing_address: fullAddress,
      days_on_market: String(daysOnMarket),
      unique_views: String(uniqueViews || 0),
      contacts: String(contacts || 0),
      days_remaining: String(daysRemaining || 0),
    }).catch(() => {}); // Non-blocking

    return NextResponse.json({
      success: true,
      days_remaining: daysRemaining,
      metrics: {
        days_on_market: daysOnMarket,
        unique_views: uniqueViews || 0,
        contacts: contacts || 0,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
