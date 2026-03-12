import { createServiceClient } from '../../../../lib/supabase';
import { createSupabaseServer } from '../../../../lib/supabase-server';
import { writeAuditLog, writeAuditLogBatch } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

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

  return profile || { id: user.id, email: user.email, role: 'admin' };
}

// GET /api/admin/users — list all profiles (or single by ?id=)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: true });

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

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/users — update profile fields (with role guards)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { ids, changes } = body;

    if (!ids?.length || !changes) {
      return NextResponse.json({ error: 'ids[] and changes are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const requestor = await getRequestingUser();

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

      // Guard 3: Regular admins can only edit their own profile
      if (!isSuperAdmin && target.id !== requestor?.id) {
        return NextResponse.json(
          { error: 'You can only edit your own profile' },
          { status: 403 }
        );
      }
    }

    // Apply update
    const { data: updatedRows, error: updateErr } = await supabase
      .from('profiles')
      .update(changes)
      .in('id', ids)
      .select();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
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

// DELETE /api/admin/users — super_admin only
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids[] is required' }, { status: 400 });
    }

    const requestor = await getRequestingUser();

    // Only super_admins can delete profiles
    if (requestor?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete user profiles' },
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

    // Delete auth users first (this cascades to profiles via FK)
    for (const id of ids) {
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
