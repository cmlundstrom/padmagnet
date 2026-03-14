import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/message-templates — all templates ordered by channel, slug
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('channel', { ascending: true })
      .order('slug', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/message-templates — update a template by id
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, subject, body_html, body_text, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates = {};
    if (subject !== undefined) updates.subject = subject;
    if (body_html !== undefined) updates.body_html = body_html;
    if (body_text !== undefined) updates.body_text = body_text;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('message_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
