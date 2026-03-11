import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { geocodeAddress } from '../../../../lib/geocode';
import { sendTemplateEmail } from '../../../../lib/email';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

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
  'owner_special_comments', 'owner_application_link', 'owner_pet_policy_details',
  'owner_utilities_included', 'owner_showing_instructions',
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
      .select('*, listing_views(count)')
      .eq('source', 'owner')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the view count from the join
    const listings = (data || []).map(l => ({
      ...l,
      unique_view_count: l.listing_views?.[0]?.count || 0,
      listing_views: undefined,
    }));

    return NextResponse.json(listings);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new owner listing (supports draft and full create)
export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const body = await request.json();
    const isDraft = body.status === 'draft';

    // Only validate required fields for non-draft submissions
    if (!isDraft && (!body.street_name || !body.city || !body.list_price)) {
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
      is_active: isDraft ? false : true,
      status: isDraft ? 'draft' : 'active',
    };

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        listing[field] = body[field];
      }
    }

    // Server-side geocoding (skip for drafts without address)
    if (!isDraft && listing.street_name && listing.city) {
      const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
      const coords = await geocodeAddress(street, listing.city, listing.state_or_province, listing.postal_code);
      if (coords.latitude) {
        listing.latitude = coords.latitude;
        listing.longitude = coords.longitude;
      }
    }

    // Generate confirmation code for non-draft listings
    if (!isDraft) {
      listing.confirmation_code = generateConfirmationCode(listing.listing_key);
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

    // Send confirmation email for non-draft listings
    if (!isDraft && data.confirmation_code) {
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

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
