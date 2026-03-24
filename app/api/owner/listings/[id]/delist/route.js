import { createServiceClient } from '../../../../../../lib/supabase';
import { getAuthUser } from '../../../../../../lib/auth-helpers';
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
      .select('id, owner_user_id, source, status, is_active, expires_at')
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

    return NextResponse.json({ success: true, days_remaining: daysRemaining });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
