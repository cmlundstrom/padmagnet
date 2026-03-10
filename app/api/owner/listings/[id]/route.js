import { createServiceClient } from '../../../../../lib/supabase';
import { getAuthUser } from '../../../../../lib/auth-helpers';
import { geocodeAddress } from '../../../../../lib/geocode';
import { sendTemplateEmail } from '../../../../../lib/email';
import { NextResponse } from 'next/server';

function generateConfirmationCode(uuid) {
  return 'PM-' + uuid.replace(/-/g, '').slice(0, 6).toUpperCase();
}

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = [
  'street_number', 'street_name', 'city', 'state_or_province', 'postal_code', 'county',
  'latitude', 'longitude',
  'property_type', 'property_sub_type', 'list_price', 'bedrooms_total', 'bathrooms_total',
  'living_area', 'lot_size_area', 'year_built',
  'public_remarks', 'tenant_contact_instructions',
  'lease_term', 'available_date',
  'pets_allowed', 'pets_deposit', 'fenced_yard', 'furnished', 'hoa_fee', 'parking_spaces', 'pool',
  'photos', 'virtual_tour_url',
  'listing_agent_name', 'listing_office_name', 'listing_agent_phone', 'listing_agent_email',
  'is_active', 'status',
];

const ADDRESS_FIELDS = ['street_number', 'street_name', 'city', 'state_or_province', 'postal_code'];

// GET — fetch an owner listing (ownership verified)
export async function GET(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: listing, error: fetchErr } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.source !== 'owner' || listing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json(listing);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
      .select('id, owner_user_id, source, status, confirmation_code, street_number, street_name, city, state_or_province, postal_code')
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

    // Re-geocode if any address field changed
    const addressChanged = ADDRESS_FIELDS.some(f => updates[f] !== undefined);
    if (addressChanged) {
      const street = [updates.street_number ?? existing.street_number, updates.street_name ?? existing.street_name].filter(Boolean).join(' ');
      const city = updates.city ?? existing.city;
      const state = updates.state_or_province ?? existing.state_or_province ?? 'FL';
      const zip = updates.postal_code ?? existing.postal_code;
      if (street && city) {
        const coords = await geocodeAddress(street, city, state, zip);
        if (coords.latitude) {
          updates.latitude = coords.latitude;
          updates.longitude = coords.longitude;
        }
      }
    }

    // Generate confirmation code when status transitions to active
    const activating = updates.status === 'active' && existing.status !== 'active';
    if (activating && !existing.confirmation_code) {
      updates.confirmation_code = generateConfirmationCode(id);
      updates.is_active = true;
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

    // Send confirmation email on activation
    if (activating) {
      const address = [data.street_number, data.street_name].filter(Boolean).join(' ');
      const fullAddress = [address, data.city, data.state_or_province].filter(Boolean).join(', ');
      sendTemplateEmail('listing_confirmed', user.email, {
        owner_name: data.listing_agent_name || user.user_metadata?.display_name || 'there',
        confirmation_code: data.confirmation_code,
        listing_address: fullAddress,
        rent: data.list_price ? `$${Number(data.list_price).toLocaleString()}/mo` : '—',
        property_type: data.property_sub_type || '—',
        beds_baths: `${data.bedrooms_total || '—'} / ${data.bathrooms_total || '—'}`,
        photo_count: `${data.photos?.length || 0} photo${(data.photos?.length || 0) !== 1 ? 's' : ''}`,
      }).catch(() => {}); // Non-blocking
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
