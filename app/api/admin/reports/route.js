import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reports
 *
 * List content_reports for the admin queue. Supports filters:
 *   ?status=open            (default — most useful state for triage)
 *   ?status=all             (no status filter)
 *   ?content_type=listing|user|message|conversation
 *   ?limit=50               (default 50, max 200)
 *
 * Each row is enriched with:
 *   - reporter_email + reporter_name (lookup against profiles)
 *   - target details (depends on content_type):
 *       listing → address + owner_user_id
 *       user    → display_name + email
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const contentType = searchParams.get('content_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const supabase = createServiceClient();

    let query = supabase
      .from('content_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') query = query.eq('status', status);
    if (contentType) query = query.eq('content_type', contentType);

    const { data: reports, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    // Enrich with reporter info
    const reporterIds = [...new Set(reports.map(r => r.reporter_id).filter(Boolean))];
    const { data: reporters } = reporterIds.length
      ? await supabase.from('profiles').select('id, display_name, email').in('id', reporterIds)
      : { data: [] };
    const reporterMap = new Map((reporters || []).map(p => [p.id, p]));

    // Enrich with target info — separate batch lookups by content_type
    const listingIds = reports.filter(r => r.content_type === 'listing').map(r => r.content_id);
    const userIds = reports.filter(r => r.content_type === 'user').map(r => r.content_id);

    const { data: listings } = listingIds.length
      ? await supabase.from('listings')
          .select('id, street_number, street_name, city, state_or_province, owner_user_id, source')
          .in('id', listingIds)
      : { data: [] };
    const listingMap = new Map((listings || []).map(l => [l.id, l]));

    const { data: users } = userIds.length
      ? await supabase.from('profiles').select('id, display_name, email, role').in('id', userIds)
      : { data: [] };
    const userMap = new Map((users || []).map(u => [u.id, u]));

    const enriched = reports.map(r => {
      const reporter = reporterMap.get(r.reporter_id);
      let target = null;
      if (r.content_type === 'listing') {
        const l = listingMap.get(r.content_id);
        if (l) {
          target = {
            type: 'listing',
            address: [l.street_number, l.street_name, l.city, l.state_or_province].filter(Boolean).join(' ').trim() || '(unknown address)',
            owner_user_id: l.owner_user_id,
            source: l.source,
          };
        }
      } else if (r.content_type === 'user') {
        const u = userMap.get(r.content_id);
        if (u) {
          target = {
            type: 'user',
            display_name: u.display_name || '(no name)',
            email: u.email,
            role: u.role,
          };
        }
      }
      return {
        ...r,
        reporter_email: reporter?.email || null,
        reporter_name: reporter?.display_name || null,
        target,
      };
    });

    return NextResponse.json({ reports: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
