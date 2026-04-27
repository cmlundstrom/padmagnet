import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { writeAuditLog } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/account/reactivate
// Self-service reactivation for archived users. The caller must already be
// authenticated (their auth.users row was preserved by archive — only admin
// "reset" hard-deletes it). Nulls profiles.archived_at and writes an audit
// entry tagged self_reactivate. Listings stay archived intentionally; owners
// re-list them individually from the Owners tab (matches the admin
// unarchive policy in /api/admin/users).
export async function POST(request) {
  try {
    const { user, error: authErr, status } = await getAuthUser(request);
    if (authErr) {
      return NextResponse.json({ error: authErr }, { status });
    }

    const supabase = createServiceClient();
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, email, archived_at, role')
      .eq('id', user.id)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.archived_at) {
      return NextResponse.json({ reactivated: false, alreadyActive: true });
    }

    const previousArchivedAt = profile.archived_at;
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ archived_at: null })
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: `Failed to reactivate: ${updateErr.message}` }, { status: 500 });
    }

    await writeAuditLog({
      tableName: 'profiles',
      rowId: user.id,
      action: 'self_reactivate',
      fieldChanged: 'archived_at',
      oldValue: previousArchivedAt,
      newValue: null,
      adminUser: profile.email || 'self',
    });

    return NextResponse.json({ reactivated: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
