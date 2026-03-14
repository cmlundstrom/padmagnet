import { createServiceClient } from '../../../../../lib/supabase';
import { getAuthUser } from '../../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id: conversationId } = await params;
    const { action } = await request.json();

    if (!['archive', 'unarchive', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "archive", "unarchive", or "delete"' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Look up conversation and verify participant
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('id, tenant_user_id, owner_user_id')
      .eq('id', conversationId)
      .single();

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Determine caller's role
    let archiveField;
    if (convo.tenant_user_id === user.id) {
      archiveField = 'archived_by_tenant';
    } else if (convo.owner_user_id === user.id) {
      archiveField = 'archived_by_owner';
    } else {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // archive and delete both set archived = true (no hard delete from client)
    const archived = action !== 'unarchive';

    const { error: updateErr } = await supabase
      .from('conversations')
      .update({ [archiveField]: archived, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, archived });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
