import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/message-templates — all templates from both tables
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Fetch from message_templates (messaging notifications: SMS/email)
    const { data: msgTemplates, error: msgErr } = await supabase
      .from('message_templates')
      .select('*')
      .order('channel', { ascending: true })
      .order('slug', { ascending: true });

    // Fetch from email_templates (transactional emails: confirmations, expiry, etc.)
    const { data: emailTemplates, error: emailErr } = await supabase
      .from('email_templates')
      .select('*')
      .order('slug', { ascending: true });

    if (msgErr || emailErr) {
      return NextResponse.json({
        error: (msgErr || emailErr).message
      }, { status: 500 });
    }

    // Normalize both into a consistent shape
    const normalized = [
      ...(msgTemplates || []).map(t => ({
        id: t.id,
        slug: t.slug,
        channel: t.channel,
        subject: t.subject,
        body_html: t.channel === 'email' ? t.body : null,
        body_text: t.channel === 'sms' ? t.body : null,
        variables: t.variables || [],
        is_active: t.is_active,
        source: 'message_templates',
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      ...(emailTemplates || []).map(t => ({
        id: t.id,
        slug: t.slug,
        channel: 'email',
        subject: t.subject,
        body_html: t.body_html || '',
        body_text: null,
        variables: Array.isArray(t.variables) ? t.variables : [],
        is_active: t.is_active,
        source: 'email_templates',
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
    ];

    // Sort: group by channel, then slug
    normalized.sort((a, b) => {
      if (a.channel !== b.channel) return a.channel.localeCompare(b.channel);
      return a.slug.localeCompare(b.slug);
    });

    return NextResponse.json(normalized);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/message-templates — update a template by id + source
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, source, subject, body_html, body_text, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const table = source === 'email_templates' ? 'email_templates' : 'message_templates';
    const supabase = createServiceClient();

    if (table === 'email_templates') {
      // email_templates schema: subject, body_html, is_active
      const updates = {};
      if (subject !== undefined) updates.subject = subject;
      if (body_html !== undefined) updates.body_html = body_html;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Return normalized shape
      return NextResponse.json({
        id: data.id,
        slug: data.slug,
        channel: 'email',
        subject: data.subject,
        body_html: data.body_html || '',
        body_text: null,
        variables: Array.isArray(data.variables) ? data.variables : [],
        is_active: data.is_active,
        source: 'email_templates',
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
    } else {
      // message_templates schema: subject, body (single field), is_active
      const updates = {};
      if (subject !== undefined) updates.subject = subject;
      // body_html maps to body for email channel, body_text maps to body for sms channel
      if (body_html !== undefined) updates.body = body_html;
      if (body_text !== undefined) updates.body = body_text;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('message_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        id: data.id,
        slug: data.slug,
        channel: data.channel,
        subject: data.subject,
        body_html: data.channel === 'email' ? data.body : null,
        body_text: data.channel === 'sms' ? data.body : null,
        variables: data.variables || [],
        is_active: data.is_active,
        source: 'message_templates',
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
