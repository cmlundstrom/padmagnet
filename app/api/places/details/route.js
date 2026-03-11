import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_KEY = process.env.GOOGLE_SERVER_GEOCODING_KEY;

// GET /api/places/details?place_id=ChIJ...
export async function GET(request) {
  try {
    const { error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('place_id');
    if (!placeId) {
      return NextResponse.json({ error: 'place_id required' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_components,geometry&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      console.error('Places details error:', data.status, data.error_message);
      return NextResponse.json({ error: 'Could not fetch address details' }, { status: 500 });
    }

    const components = data.result.address_components || [];
    const get = (type) => components.find(c => c.types.includes(type));

    const address = {
      street_number: get('street_number')?.short_name || '',
      street_name: get('route')?.short_name || '',
      city: get('locality')?.long_name || get('sublocality')?.long_name || '',
      state_or_province: get('administrative_area_level_1')?.short_name || 'FL',
      postal_code: get('postal_code')?.long_name || '',
      county: get('administrative_area_level_2')?.long_name || '',
      latitude: data.result.geometry?.location?.lat || null,
      longitude: data.result.geometry?.location?.lng || null,
    };

    return NextResponse.json(address);
  } catch (err) {
    console.error('Places details error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
