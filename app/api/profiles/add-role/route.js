import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/profiles/add-role
// Body: { targetRole: 'owner' | 'tenant' }
//
// Self-service role acquisition for existing users. Lets a tenant add
// 'owner' to their roles[] (or vice versa) so they can switch between
// renter and owner surfaces without admin intervention. Idempotent —
// adding a role that's already present just returns the current state.
//
// Does NOT update profiles.role (active role) — that's the caller's job
// after the API returns, via AuthProvider.switchRole + the REST PATCH
// pattern RoleSwitcher uses. Splitting ADD (entitlement grow) from
// SWITCH (active role change) keeps each endpoint single-purpose.
//
// Does NOT grant admin/super_admin — those require explicit admin
// assignment via /api/admin/users PATCH.
//
// Part of project_auth_rebuild_plan.md Phase 3 dual-role system —
// completes the acquisition path that was scoped but never shipped.
export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json();
    const { targetRole } = body;

    if (!['tenant', 'owner'].includes(targetRole)) {
      return NextResponse.json(
        { error: 'targetRole must be "tenant" or "owner"' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentRoles = profile.roles || [];

    // Idempotent — already has the role, no write needed.
    if (currentRoles.includes(targetRole)) {
      return NextResponse.json({ roles: currentRoles, added: false });
    }

    const nextRoles = [...currentRoles, targetRole];

    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .update({ roles: nextRoles })
      .eq('id', user.id)
      .select('roles')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ roles: updated.roles, added: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
