import { createServiceClient } from '../../../../lib/supabase';
import { createSupabaseServer } from '../../../../lib/supabase-server';
import { writeAuditLogBatch } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// Helper: get the requesting user's profile (role check)
async function getRequestingUser() {
  const authClient = createSupabaseServer();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile || null;
}

// GET /api/admin/users — list profiles by role filter
// ?role=tenant|owner|admin (default: admin+super_admin)
// ?id=uuid (single profile lookup)
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const roleFilter = searchParams.get('role');

    const supabase = createServiceClient();

    if (id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // Build query with role filter
    let query = supabase.from('profiles').select('*');
    if (roleFilter === 'tenant') {
      query = query.eq('role', 'tenant');
    } else if (roleFilter === 'owner') {
      query = query.eq('role', 'owner');
    } else {
      // Default: admin panel (Administrators tab)
      query = query.in('role', ['admin', 'super_admin']);
    }
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with auth status (last_sign_in_at, invited_at)
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authMap = {};
    if (authData?.users) {
      for (const u of authData.users) {
        authMap[u.id] = {
          last_sign_in_at: u.last_sign_in_at || null,
          invited_at: u.invited_at || null,
          email_confirmed_at: u.email_confirmed_at || null,
        };
      }
    }

    const enriched = data.map(profile => ({
      ...profile,
      auth_status: authMap[profile.id] || null,
    }));

    // For owners, enrich with listing count
    if (roleFilter === 'owner' && enriched.length > 0) {
      const ownerIds = enriched.map(p => p.id);
      const { data: listings } = await supabase
        .from('listings')
        .select('owner_user_id, status')
        .in('owner_user_id', ownerIds)
        .eq('source', 'owner');

      const listingCounts = {};
      if (listings) {
        for (const l of listings) {
          if (!listingCounts[l.owner_user_id]) {
            listingCounts[l.owner_user_id] = { total: 0, active: 0 };
          }
          listingCounts[l.owner_user_id].total++;
          if (l.status === 'active') listingCounts[l.owner_user_id].active++;
        }
      }
      for (const profile of enriched) {
        profile.listing_counts = listingCounts[profile.id] || { total: 0, active: 0 };
      }
    }

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/users — update profile fields (with role guards)
export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ids, changes } = body;

    if (!ids?.length || !changes) {
      return NextResponse.json({ error: 'ids[] and changes are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const requestor = await getRequestingUser();

    if (!requestor) {
      return NextResponse.json({ error: 'Could not verify admin profile' }, { status: 403 });
    }

    // Fetch target rows
    const { data: oldRows, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // === ROLE GUARDS ===
    const isSuperAdmin = requestor?.role === 'super_admin';

    for (const target of oldRows) {
      // Guard 1: Regular admins cannot edit super_admin profiles (except their own)
      if (target.role === 'super_admin' && !isSuperAdmin && target.id !== requestor?.id) {
        return NextResponse.json(
          { error: 'Only super admins can modify super admin profiles' },
          { status: 403 }
        );
      }

      // Guard 2: Only super_admins can change anyone's role
      if (changes.role && !isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only super admins can change user roles' },
          { status: 403 }
        );
      }

      // Guard 3: Regular admins can edit tenant/owner profiles, but not other admin profiles
      if (!isSuperAdmin && target.id !== requestor?.id && ['admin', 'super_admin'].includes(target.role)) {
        return NextResponse.json(
          { error: 'You can only edit your own admin profile' },
          { status: 403 }
        );
      }
    }

    // Field allowlist — prevent mass assignment
    const ALLOWED_FIELDS = ['display_name', 'phone', 'sms_consent', 'preferred_channel', 'expo_push_token'];
    const SUPER_ADMIN_FIELDS = [...ALLOWED_FIELDS, 'role', 'roles', 'email', 'tier', 'tier_expires_at', 'tier_started_at', 'is_active'];
    const allowedSet = isSuperAdmin ? SUPER_ADMIN_FIELDS : ALLOWED_FIELDS;
    const safeChanges = Object.fromEntries(
      Object.entries(changes).filter(([k]) => allowedSet.includes(k))
    );

    if (Object.keys(safeChanges).length === 0) {
      return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 });
    }

    // Apply update
    const { data: updatedRows, error: updateErr } = await supabase
      .from('profiles')
      .update(safeChanges)
      .in('id', ids)
      .select();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Broadcast role_changed if role or roles were updated
    if (changes.role || changes.roles) {
      for (const id of ids) {
        const row = updatedRows.find(r => r.id === id);
        await supabase.channel(`admin-events-${id}`)
          .send({
            type: 'broadcast',
            event: 'role_changed',
            payload: { role: row?.role, roles: row?.roles },
          });
      }
    }

    // Sync email to auth.users if email was changed
    if (changes.email) {
      for (const id of ids) {
        const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
          email: changes.email,
          email_confirm: true, // Admin override — no verification needed
        });
        if (authErr) {
          console.error(`[Admin] Failed to sync auth email for ${id}:`, authErr.message);
        }
      }
    }

    // Write audit logs for each changed field
    const auditEntries = [];
    for (const oldRow of oldRows) {
      for (const [field, newVal] of Object.entries(changes)) {
        const oldVal = oldRow[field];
        if (String(oldVal) !== String(newVal)) {
          auditEntries.push({
            tableName: 'profiles',
            rowId: oldRow.id,
            action: 'update',
            fieldChanged: field,
            oldValue: oldVal,
            newValue: newVal,
            adminUser: requestor?.email || 'admin',
          });
        }
      }
    }
    await writeAuditLogBatch(auditEntries);

    return NextResponse.json(updatedRows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/users — archive or unarchive users (archive-first primary action).
// Archive preserves all data, hides the user from default admin views, and
// archives any active listings so they leave the renter feed. Unarchive clears
// the flag; listings stay de-listed and the owner relists them individually.
// Available to any admin. Hard delete lives at DELETE (super_admin only).
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { action, ids } = body;

    if (!['archive', 'unarchive'].includes(action)) {
      return NextResponse.json({ error: 'action must be "archive" or "unarchive"' }, { status: 400 });
    }
    if (!ids?.length) {
      return NextResponse.json({ error: 'ids[] is required' }, { status: 400 });
    }

    const requestor = await getRequestingUser();
    if (!requestor) {
      return NextResponse.json({ error: 'Could not verify admin profile' }, { status: 403 });
    }

    if (ids.includes(requestor.id)) {
      return NextResponse.json({ error: `You cannot ${action} your own profile` }, { status: 403 });
    }

    const supabase = createServiceClient();
    const archivedAt = action === 'archive' ? new Date().toISOString() : null;

    const { data: oldRows, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);
    if (fetchErr) {
      return NextResponse.json({ error: `Failed to load profiles: ${fetchErr.message}` }, { status: 500 });
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ archived_at: archivedAt })
      .in('id', ids);
    if (updateErr) {
      return NextResponse.json({ error: `Failed to ${action}: ${updateErr.message}` }, { status: 500 });
    }

    if (action === 'archive') {
      // Archive any listings the user still has in an active state so they
      // leave the renter feed. Matches the self-delete flow semantics.
      const { error: listingsErr } = await supabase
        .from('listings')
        .update({ status: 'archived', is_active: false })
        .in('owner_user_id', ids)
        .in('status', ['active', 'pending_review', 'draft']);
      if (listingsErr) {
        console.error('[archive] listings archive failed:', listingsErr.message);
      }
    }

    const auditEntries = (oldRows || []).map(row => ({
      tableName: 'profiles',
      rowId: row.id,
      action: action === 'archive' ? 'archive' : 'unarchive',
      fieldChanged: 'archived_at',
      oldValue: row.archived_at,
      newValue: archivedAt,
      adminUser: requestor?.email || 'admin',
    }));
    await writeAuditLogBatch(auditEntries);

    return NextResponse.json({ [action === 'archive' ? 'archived' : 'unarchived']: ids.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE removed intentionally. Admin dashboard is archive-only.
// Maestro test cleanup goes direct to Supabase auth.admin in
// mobile/.maestro/helpers/cleanup_test_users.js.
