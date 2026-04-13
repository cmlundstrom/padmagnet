/**
 * Renter Tier Redeem — Spend 350 PadPoints to unlock AskPad Explorer tier
 */
import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EXPLORER_COST = 350;

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('padpoints, renter_tier')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    if (profile.renter_tier === 'master') {
      return NextResponse.json({ error: 'You already have Pad Master tier' }, { status: 400 });
    }

    if (profile.renter_tier === 'explorer') {
      return NextResponse.json({ error: 'You already have AskPad Explorer tier' }, { status: 400 });
    }

    if ((profile.padpoints || 0) < EXPLORER_COST) {
      return NextResponse.json({
        error: `Not enough PadPoints. You need ${EXPLORER_COST} but have ${profile.padpoints || 0}.`,
        needed: EXPLORER_COST,
        current: profile.padpoints || 0,
      }, { status: 400 });
    }

    // Deduct PadPoints and upgrade tier
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        padpoints: (profile.padpoints || 0) - EXPLORER_COST,
        renter_tier: 'explorer',
        search_zones_count: 2,
      })
      .eq('id', user.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      tier: 'explorer',
      padpointsDeducted: EXPLORER_COST,
      padpointsRemaining: (profile.padpoints || 0) - EXPLORER_COST,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
