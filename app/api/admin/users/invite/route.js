import { createServiceClient } from '../../../../../lib/supabase';
import { createSupabaseServer } from '../../../../../lib/supabase-server';
import { writeAuditLog } from '../../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, display_name } = body;

    if (!email || !display_name) {
      return NextResponse.json(
        { error: 'Email and first name are required' },
        { status: 400 }
      );
    }

    // Verify requestor is super_admin
    const authClient = createSupabaseServer();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: requestorProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (requestorProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can invite users' },
        { status: 403 }
      );
    }

    // Send invite via Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { display_name },
      redirectTo: 'https://padmagnet.com/auth/callback?next=/admin/set-password',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Audit log
    await writeAuditLog({
      tableName: 'profiles',
      rowId: data.user?.id || null,
      action: 'invite',
      newValue: JSON.stringify({ email, display_name }),
      adminUser: requestorProfile?.email || user.email,
    });

    return NextResponse.json({ success: true, user: data.user }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
