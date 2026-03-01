import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

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
];

// GET — list owner's own listings
export async function GET(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('source', 'owner')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new owner listing
export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.street_name || !body.city || !body.list_price) {
      return NextResponse.json(
        { error: 'street_name, city, and list_price are required' },
        { status: 400 }
      );
    }

    // Whitelist fields
    const listing = {
      listing_key: `owner-${randomUUID()}`,
      source: 'owner',
      owner_user_id: user.id,
      property_type: 'Residential Lease',
      state_or_province: 'FL',
      is_active: true,
    };

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        listing[field] = body[field];
      }
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('listings')
      .insert(listing)
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
