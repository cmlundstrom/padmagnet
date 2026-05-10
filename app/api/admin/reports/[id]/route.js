import { createServiceClient } from '../../../../../lib/supabase';
import { writeAuditLogBatch } from '../../../../../lib/api-helpers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reports/[id]
 *
 * Resolve a content_reports row. Body: { action, notes? }
 *
 * Actions:
 *   - dismiss          → status='dismissed', resolution_action='dismissed'
 *                        Admin reviewed and determined the flag is invalid.
 *                        NO mutation on listing/user.
 *   - hide_content     → status='resolved', resolution_action='content_hidden'
 *                        Sets listings.is_active=false. Removes from EVERY
 *                        user's swipe deck, search, and detail pages globally.
 *                        Listing-only. Reversible via Admin > Listings.
 *   - ban_user         → status='resolved', resolution_action='user_banned'
 *                        Archives the TARGET of the report (the user being
 *                        flagged). Sets profiles.archived_at on content_id.
 *                        User-content-type only. super_admin protected.
 *   - ban_reporter     → status='resolved', resolution_action='reporter_banned'
 *                        Archives the user who SUBMITTED the report (not the
 *                        target). Use when the reporter is abusing the flag
 *                        system (serial false-flagging, harassment via
 *                        reports). super_admin protected.
 *   - escalate         → status='triaged', resolution_action='escalated_legal'
 *                        Keep report in queue, flag for legal review. No
 *                        automated mutation.
 *
 * Audit-logged via the canonical writeAuditLogBatch helper using
 * entity_type='content_report' (no separate audit table).
 */
export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body || {};

    const VALID_ACTIONS = ['dismiss', 'hide_content', 'ban_user', 'ban_reporter', 'escalate'];
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: report, error: fetchErr } = await supabase
      .from('content_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status !== 'open' && action !== 'dismiss') {
      // Allow re-dismiss from any state for cleanup, but block other actions on already-resolved
      return NextResponse.json({ error: `Report already ${report.status}` }, { status: 409 });
    }

    const adminId = auth.user.id;
    const adminEmail = auth.user.email;
    const auditEntries = [];

    let resolutionAction = null;
    let nextStatus = 'resolved';

    switch (action) {
      case 'dismiss': {
        resolutionAction = 'dismissed';
        nextStatus = 'dismissed';
        break;
      }

      case 'hide_content': {
        if (report.content_type !== 'listing') {
          return NextResponse.json(
            { error: 'hide_content only supported for listings' },
            { status: 400 }
          );
        }
        const { error: hideErr } = await supabase
          .from('listings')
          .update({ is_active: false })
          .eq('id', report.content_id);
        if (hideErr) {
          return NextResponse.json({ error: hideErr.message }, { status: 500 });
        }
        resolutionAction = 'content_hidden';
        auditEntries.push({
          tableName: 'listings', rowId: report.content_id, action: 'hide_content',
          fieldChanged: 'is_active', oldValue: true, newValue: false,
          metadata: { reason: 'content_report', report_id: id },
        });
        break;
      }

      case 'ban_user': {
        if (report.content_type !== 'user') {
          return NextResponse.json(
            { error: 'ban_user only supported for user reports' },
            { status: 400 }
          );
        }
        // Protect super_admin from being banned via this flow
        const { data: target } = await supabase
          .from('profiles').select('id, role, archived_at').eq('id', report.content_id).single();
        if (!target) {
          return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
        }
        if (target.role === 'super_admin') {
          return NextResponse.json(
            { error: 'Cannot ban super_admin via this endpoint' },
            { status: 403 }
          );
        }
        const { error: banErr } = await supabase
          .from('profiles').update({ archived_at: new Date().toISOString() }).eq('id', report.content_id);
        if (banErr) {
          return NextResponse.json({ error: banErr.message }, { status: 500 });
        }
        resolutionAction = 'user_banned';
        auditEntries.push({
          tableName: 'profiles', rowId: report.content_id, action: 'ban_user',
          fieldChanged: 'archived_at', oldValue: target.archived_at, newValue: new Date().toISOString(),
          metadata: { reason: 'content_report', report_id: id },
        });
        break;
      }

      case 'ban_reporter': {
        if (!report.reporter_id) {
          return NextResponse.json(
            { error: 'Cannot ban reporter — reporter_id is null (anon or deleted)' },
            { status: 400 }
          );
        }
        const { data: reporter } = await supabase
          .from('profiles').select('id, role, archived_at').eq('id', report.reporter_id).single();
        if (!reporter) {
          return NextResponse.json({ error: 'Reporter profile not found' }, { status: 404 });
        }
        if (reporter.role === 'super_admin') {
          return NextResponse.json(
            { error: 'Cannot ban super_admin via this endpoint' },
            { status: 403 }
          );
        }
        const { error: banErr } = await supabase
          .from('profiles').update({ archived_at: new Date().toISOString() }).eq('id', report.reporter_id);
        if (banErr) {
          return NextResponse.json({ error: banErr.message }, { status: 500 });
        }
        // Note: per the v1.0.1 design we use 'user_banned' resolution_action
        // for both ban_user (target) and ban_reporter (flagger) since the DB
        // CHECK constraint on resolution_action only enumerates those values.
        // The audit log + metadata distinguish the actor.
        resolutionAction = 'user_banned';
        auditEntries.push({
          tableName: 'profiles', rowId: report.reporter_id, action: 'ban_reporter',
          fieldChanged: 'archived_at', oldValue: reporter.archived_at, newValue: new Date().toISOString(),
          metadata: { reason: 'abusive_reporting', report_id: id, banned_role: 'reporter' },
        });
        break;
      }

      case 'escalate': {
        resolutionAction = 'escalated_legal';
        nextStatus = 'triaged';
        break;
      }
    }

    // Resolve the report row
    const { error: updateErr } = await supabase
      .from('content_reports')
      .update({
        status: nextStatus,
        resolution_action: resolutionAction,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    auditEntries.push({
      tableName: 'content_reports', rowId: id, action: `report_${action}`,
      fieldChanged: 'status', oldValue: report.status, newValue: nextStatus,
      metadata: { content_type: report.content_type, content_id: report.content_id, reason_code: report.reason_code, notes: notes || null },
    });

    await writeAuditLogBatch(supabase, auditEntries, adminEmail);

    return NextResponse.json({ ok: true, status: nextStatus, resolution_action: resolutionAction });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
