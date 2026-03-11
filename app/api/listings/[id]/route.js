import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { calculatePadScore } from '../../../../lib/padscore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Fetch user preferences for PadScore
    const { data: prefs } = await supabase
      .from('tenant_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const padScore = calculatePadScore(prefs, listing);

    // Record unique view (fire-and-forget, non-blocking) — only for active listings
    if (listing.is_active) {
      supabase
        .from('listing_views')
        .upsert({ listing_id: id, user_id: user.id }, { onConflict: 'listing_id,user_id' })
        .then(() => {}, () => {});
    }

    return NextResponse.json({ ...listing, padScore });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
