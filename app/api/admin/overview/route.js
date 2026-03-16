import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/overview — aggregated stats for the admin overview panel
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServiceClient();

    // Run queries in parallel
    const [activeRes, ownerRes, syncRes, ownerListingRes] = await Promise.all([
      // Count active MLS listings
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('source', 'mls'),

      // Count active owner listings
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('source', 'owner'),

      // Last 10 sync logs
      supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10),

      // Most recent owner listing
      supabase
        .from('listings')
        .select('city, street_number, street_name, created_at')
        .eq('source', 'owner')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const syncLogs = syncRes.data || [];
    const lastSync = syncLogs[0] || null;

    return NextResponse.json({
      activeListings: activeRes.count || 0,
      ownerListings: ownerRes.count || 0,
      lastSync,
      syncLogs,
      lastOwnerListing: ownerListingRes.data || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
