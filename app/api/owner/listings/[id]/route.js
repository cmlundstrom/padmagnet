import { createServiceClient } from '../../../../../lib/supabase';
import { getAuthUser } from '../../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = [
  'street_number', 'street_name', 'city', 'state_or_province', 'postal_code', 'county',
  'latitude', 'longitude',
  'property_type', 'property_sub_type', 'list_price', 'bedrooms_total', 'bathrooms_total',
  'living_area', 'lot_size_area', 'year_built',
  'lease_term', 'available_date',
  'pets_allowed', 'pets_deposit', 'fenced_yard', 'furnished', 'hoa_fee', 'parking_spaces', 'pool',
  'photos', 'virtual_tour_url',
  'listing_agent_name', 'listing_office_name', 'listing_agent_phone', 'listing_agent_email',
  'is_active',
];

// PUT — update an owner listing
export async function PUT(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = createServiceClient();

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, source')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existing.source !== 'owner' || existing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Whitelist fields
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('listings')
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

// DELETE — deactivate an owner listing
export async function DELETE(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, source')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existing.source !== 'owner' || existing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Soft delete — deactivate
    const { error } = await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
