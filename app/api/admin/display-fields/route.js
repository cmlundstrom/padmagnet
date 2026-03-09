import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET — list all display field configs ordered by sort_order
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('display_field_configs')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new display field config
export async function POST(request) {
  try {
    const body = await request.json();
    const { output_key, label, section, canonical_column, render_type, sort_order, format_options } = body;

    if (!output_key || !label || !section || !canonical_column) {
      return NextResponse.json(
        { error: 'output_key, label, section, and canonical_column are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('display_field_configs')
      .insert({
        output_key,
        label,
        section,
        canonical_column,
        render_type: render_type || 'text',
        sort_order: sort_order || 0,
        format_options: format_options || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update display field config(s)
// Accepts AdminTable format: { ids: [...], changes: { field: value } }
export async function PATCH(request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    let targets;
    if (body.ids && body.changes) {
      targets = body.ids.map(id => ({ id, updates: { ...body.changes } }));
    } else {
      const { id, ...updates } = body;
      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
      }
      targets = [{ id, updates }];
    }

    const results = [];

    for (const { id, updates } of targets) {
      // Convert string → boolean for visible / visible_owner
      if (typeof updates.visible === 'string') {
        updates.visible = updates.visible === 'true';
      }
      if (typeof updates.visible_owner === 'string') {
        updates.visible_owner = updates.visible_owner === 'true';
      }

      // Convert string → int for sort_order
      if (updates.sort_order !== undefined) {
        updates.sort_order = parseInt(updates.sort_order, 10);
      }

      const { data, error } = await supabase
        .from('display_field_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      results.push(data);
    }

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — hard delete a display field config
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('display_field_configs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
