import { createServiceClient } from '../../../../lib/supabase';
import { createSupabaseServer } from '../../../../lib/supabase-server';
import { writeAuditLog, writeAuditLogBatch } from '../../../../lib/api-helpers';
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

// DELETE /api/admin/users — PERMANENT hard delete (super_admin only).
// Archive via POST is the primary action. This path exists for testing cleanup
// and (eventually) legal deletion requests. Cleans every FK-referencing row
// before calling auth.admin.deleteUser, and names the specific step on failure.
export async function DELETE(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids[] is required' }, { status: 400 });
    }

    const requestor = await getRequestingUser();

    if (!requestor) {
      return NextResponse.json({ error: 'Could not verify admin profile' }, { status: 403 });
    }

    // Only super_admins can hard-delete profiles
    if (requestor?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can permanently delete user profiles' },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();

    // Prevent deleting your own profile
    if (ids.includes(requestor.id)) {
      return NextResponse.json(
        { error: 'You cannot delete your own profile' },
        { status: 403 }
      );
    }

    // Snapshot before deletion
    const { data: rows, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Broadcast session_killed to each user's Realtime channel BEFORE deletion
    for (const id of ids) {
      await supabase.channel(`admin-events-${id}`)
        .send({ type: 'broadcast', event: 'session_killed', payload: {} });
    }

    // Cleanup helper — throws on error with the specific step labelled.
    const run = async (step, promise) => {
      const { error } = await promise;
      if (error) throw new Error(`${step}: ${error.message}`);
    };

    // Clean up all referencing rows before deleting auth user
    for (const id of ids) {
      // Resolve conversation ids once up front — used by multiple cleanup steps.
      const { data: convos, error: convoFetchErr } = await supabase
        .from('conversations')
        .select('id')
        .or(`tenant_user_id.eq.${id},owner_user_id.eq.${id}`);
      if (convoFetchErr) {
        return NextResponse.json({ error: `conversations lookup: ${convoFetchErr.message}` }, { status: 500 });
      }
      const convoIds = (convos || []).map(c => c.id);

      // Resolve message ids in those conversations for delivery queue cleanup.
      let messageIds = [];
      if (convoIds.length) {
        const { data: msgs, error: msgFetchErr } = await supabase
          .from('messages')
          .select('id')
          .in('conversation_id', convoIds);
        if (msgFetchErr) {
          return NextResponse.json({ error: `messages lookup: ${msgFetchErr.message}` }, { status: 500 });
        }
        messageIds = (msgs || []).map(m => m.id);
      }

      try {
        // phone_mappings can reference conversations via conversation_id regardless
        // of whose user_id is on the mapping row — clean both paths BEFORE touching
        // conversations. This was the FK chain that blocked previous attempts.
        if (convoIds.length) {
          await run(
            'phone_mappings by conversation',
            supabase.from('phone_mappings').delete().in('conversation_id', convoIds)
          );
        }
        await run('phone_mappings by user', supabase.from('phone_mappings').delete().eq('user_id', id));

        // Nullify sender_id on any orphan message rows owned by this user.
        await run('messages.sender_id nullify', supabase.from('messages').update({ sender_id: null }).eq('sender_id', id));

        if (convoIds.length) {
          await run(
            'webhook_logs nullify',
            supabase.from('webhook_logs')
              .update({ conversation_id: null, message_id: null })
              .in('conversation_id', convoIds)
          );
        }
        if (messageIds.length) {
          await run(
            'message_delivery_queue delete',
            supabase.from('message_delivery_queue').delete().in('message_id', messageIds)
          );
        }
        if (convoIds.length) {
          await run('messages delete', supabase.from('messages').delete().in('conversation_id', convoIds));
        }
        await run(
          'conversations delete',
          supabase.from('conversations').delete().or(`tenant_user_id.eq.${id},owner_user_id.eq.${id}`)
        );

        await run('swipes delete', supabase.from('swipes').delete().eq('user_id', id));
        await run('listing_views delete', supabase.from('listing_views').delete().eq('user_id', id));
        await run('askpad_chats delete', supabase.from('askpad_chats').delete().eq('user_id', id));
        await run('tenant_preferences delete', supabase.from('tenant_preferences').delete().eq('user_id', id));

        // Archive listings (leave feed) and null owner_user_id (detach FK).
        await run(
          'listings detach',
          supabase.from('listings')
            .update({ status: 'archived', is_active: false, owner_user_id: null })
            .eq('owner_user_id', id)
        );
      } catch (cleanupErr) {
        return NextResponse.json({ error: `Pre-delete cleanup failed — ${cleanupErr.message}` }, { status: 500 });
      }

      // Now delete auth user (cascades to profiles via the ON DELETE CASCADE in migration 004)
      const { error: authErr } = await supabase.auth.admin.deleteUser(id);
      if (authErr) {
        return NextResponse.json({ error: `Failed to delete auth user: ${authErr.message}` }, { status: 500 });
      }
    }

    const auditEntries = rows.map(row => ({
      tableName: 'profiles',
      rowId: row.id,
      action: 'delete',
      oldValue: JSON.stringify(row),
      metadata: { snapshot: row },
      adminUser: requestor?.email || 'admin',
    }));
    await writeAuditLogBatch(auditEntries);

    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
