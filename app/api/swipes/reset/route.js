import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('swipes')
      .delete()
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: data?.length || 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
