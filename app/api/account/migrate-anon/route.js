import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { writeAuditLog } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/account/migrate-anon
// Migrates a renter's pre-auth swipes (saves) from their abandoned
// anonymous user_id to their newly authenticated user_id. Called by
// the mobile AuthProvider's SIGNED_IN handler after a successful
// signin/signup when AsyncStorage has a `pending_anon_migration_user_id`
// stashed at L1-trigger time.
//
// Without this endpoint, anon renters who heart-tap a listing and then
// auth lose their save — the swipes table is keyed on user_id and the
// anon user_id is abandoned by Supabase signUp/signIn. Diagnosed
// 2026-04-27: project_anon_save_lost_diagnosis.md.
//
// Scope: just `swipes` for now. The endpoint is designed to grow —
// add UPDATEs for padpoints_ledger, tenant_preferences, search_zones,
// askpad_chats inside this same handler when those classes need
// migration too. Single endpoint, one transaction, atomic per call.
export async function POST(request) {
  try {
    const { user, error: authErr, status } = await getAuthUser(request);
    if (authErr) {
      return NextResponse.json({ error: authErr }, { status });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const previousAnonUserId = body?.previousAnonUserId;
    if (!previousAnonUserId || typeof previousAnonUserId !== 'string') {
      return NextResponse.json(
        { error: 'previousAnonUserId required (string uuid)' },
        { status: 400 }
      );
    }

    if (previousAnonUserId === user.id) {
      return NextResponse.json(
        { error: 'previousAnonUserId cannot equal current user id' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify the previousAnonUserId exists AND is an anonymous user.
    // Prevents abuse where a caller tries to migrate someone else's
    // (non-anon) data into their own account.
    const { data: prevAuth, error: prevErr } = await supabase.auth.admin.getUserById(previousAnonUserId);
    if (prevErr || !prevAuth?.user) {
      // Prior session already purged or never existed — nothing to do.
      // Return success with migrated:0 so the client doesn't retry.
      return NextResponse.json({ migrated: 0, note: 'previousAnonUserId not found' });
    }
    if (!prevAuth.user.is_anonymous) {
      return NextResponse.json(
        { error: 'previousAnonUserId must be an anonymous user' },
        { status: 400 }
      );
    }

    // Move swipes (saves) from the abandoned anon user_id to the
    // newly authed user_id. Single UPDATE — atomic in Postgres.
    //
    // Edge case: if the new authed user already swiped some of these
    // listings (rare — they're brand-new most of the time), the
    // UNIQUE(user_id, listing_id) constraint would fire. Caller
    // (mobile) treats migration failure as soft-fail and continues.
    // Returning-after-clear users hitting this is an edge worth
    // wrapping in a CTE later (move non-conflicting + delete leftovers);
    // not load-bearing for v1.
    const { error: updateErr, count } = await supabase
      .from('swipes')
      .update({ user_id: user.id }, { count: 'exact' })
      .eq('user_id', previousAnonUserId);

    if (updateErr) {
      console.error('[migrate-anon] UPDATE swipes failed:', updateErr.message);
      return NextResponse.json(
        { error: `Migration failed: ${updateErr.message}`, migrated: 0 },
        { status: 500 }
      );
    }

    const migrated = count ?? 0;

    if (migrated > 0) {
      await writeAuditLog({
        tableName: 'swipes',
        rowId: user.id,
        action: 'anon_migrate',
        fieldChanged: 'user_id',
        oldValue: previousAnonUserId,
        newValue: user.id,
        adminUser: user.email || 'self',
        metadata: { swipes_migrated: migrated },
      });
    }

    return NextResponse.json({ migrated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
