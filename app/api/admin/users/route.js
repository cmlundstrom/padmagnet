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

    if (!['archive', 'unarchive', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'action must be "archive", "unarchive", or "reset"' }, { status: 400 });
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

    // Reset = hard delete the user + all owned data. Super-admin only,
    // requires the user to already be archived (defensive — forces an
    // archive review before nuke), and requires confirmEmail to match.
    // Designed for recycling test accounts (e.g. support@padmagnet.com).
    if (action === 'reset') {
      if (requestor.role !== 'super_admin') {
        return NextResponse.json({ error: 'Only super admins can reset users' }, { status: 403 });
      }
      if (ids.length !== 1) {
        return NextResponse.json({ error: 'reset only accepts one id at a time' }, { status: 400 });
      }
      return await resetUser(ids[0], body.confirmEmail, requestor);
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

// Reset = hard-delete a user + every row tied to them. Used to recycle
// test email addresses (e.g. support@padmagnet.com) so we can re-register
// fresh from today forward.
//
// Why a custom function: Many user-FK tables (listings, conversations,
// messages, billing, etc.) are NOT defined with ON DELETE CASCADE.
// Calling auth.admin.deleteUser directly would hit FK violations for
// any user with real activity. We delete user-owned rows in dependency
// order, then auth.users (which cascades the few CASCADE-defined tables
// like profiles, swipes, listing_views, tenant_preferences).
async function resetUser(userId, confirmEmail, requestor) {
  const supabase = createServiceClient();

  // Fetch the target's email and verify confirmEmail matches (typo-protect)
  const { data: target } = await supabase
    .from('profiles')
    .select('id, email, archived_at, role')
    .eq('id', userId)
    .single();

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!target.archived_at) {
    return NextResponse.json(
      { error: 'User must be archived before reset. Archive first, then reset.' },
      { status: 400 }
    );
  }
  if (!confirmEmail || confirmEmail.toLowerCase() !== (target.email || '').toLowerCase()) {
    return NextResponse.json(
      { error: 'confirmEmail must match the target user email exactly' },
      { status: 400 }
    );
  }

  // Delete in dependency order. Each step ignores not-found / no-rows;
  // we only fail hard on actual SQL errors. Order: user-as-tenant rows,
  // user-as-owner rows, then auth.users (cascades the rest).
  const cleanupSteps = [
    // Tenant-side activity (mostly already CASCADE, but list explicitly
    // for tables that aren't or for clarity)
    { table: 'messages', filters: [['sender_id', userId], ['recipient_id', userId]] },
    { table: 'conversations', filters: [['tenant_user_id', userId], ['owner_user_id', userId]] },
    { table: 'showing_requests', filters: [['tenant_user_id', userId]] },
    { table: 'rent_range_reports', filters: [['created_by', userId]] },
    { table: 'rent_range_shares', filters: [['sent_by', userId]] },
    // Owner-side data
    { table: 'documents', filters: [['owner_user_id', userId], ['sent_to_user_id', userId]] },
    { table: 'availability_blocks', filters: [['owner_user_id', userId]] },
    { table: 'invoices', filters: [['owner_user_id', userId]] },
    { table: 'ledger_entries', filters: [['owner_user_id', userId]] },
    { table: 'payments', filters: [['owner_user_id', userId]] },
    { table: 'subscriptions', filters: [['user_id', userId], ['owner_user_id', userId]] },
    { table: 'owner_purchases', filters: [['user_id', userId]] },
    // Listings last so anything referencing them is already gone
    { table: 'listings', filters: [['owner_user_id', userId]] },
  ];

  const deletedSummary = {};
  for (const step of cleanupSteps) {
    let totalDeleted = 0;
    for (const [col, val] of step.filters) {
      const { error, count } = await supabase
        .from(step.table)
        .delete({ count: 'exact' })
        .eq(col, val);
      // PostgREST returns 42P01 (undefined_table) or PGRST205 if the
      // table/column doesn't exist on this deployment — treat as no-op.
      if (error && !['42P01', '42703', 'PGRST205'].includes(error.code)) {
        return NextResponse.json(
          { error: `Cleanup failed at ${step.table}.${col}: ${error.message}` },
          { status: 500 }
        );
      }
      totalDeleted += count || 0;
    }
    if (totalDeleted > 0) deletedSummary[step.table] = totalDeleted;
  }

  // Now delete auth.users — cascades profiles, swipes, listing_views,
  // tenant_preferences, tenant_search_zones, askpad_chats per migration FKs.
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
  if (authErr) {
    return NextResponse.json(
      { error: `Auth user delete failed: ${authErr.message}`, partial: deletedSummary },
      { status: 500 }
    );
  }

  // Audit log — single entry recording the reset
  await writeAuditLogBatch([{
    tableName: 'profiles',
    rowId: userId,
    action: 'reset',
    fieldChanged: '*',
    oldValue: target.email,
    newValue: null,
    adminUser: requestor?.email || 'admin',
  }]);

  return NextResponse.json({
    reset: true,
    email: target.email,
    deleted: { ...deletedSummary, auth_users: 1, profiles: 1 },
  });
}
