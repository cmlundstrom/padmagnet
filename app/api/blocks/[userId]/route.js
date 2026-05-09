import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { isValidUUID } from '../../../../lib/validate';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { userId } = await params;

    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
