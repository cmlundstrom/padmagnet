import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Dedicated Places API key (GOOGLE_GEOCODING_KEY) — separate from the server geocoding key
// Falls back to GOOGLE_SERVER_GEOCODING_KEY for local dev if only one key is configured
const GOOGLE_KEY = process.env.GOOGLE_GEOCODING_KEY || process.env.GOOGLE_SERVER_GEOCODING_KEY;

// GET /api/places/autocomplete?input=123+Main
export async function GET(request) {
  try {
    const { error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { searchParams } = new URL(request.url);
    const input = searchParams.get('input');
    if (!input || input.length < 3) {
      return NextResponse.json({ predictions: [] });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places autocomplete error:', data.status, data.error_message);
      return NextResponse.json({ predictions: [] });
    }

    const predictions = (data.predictions || []).map(p => ({
      place_id: p.place_id,
      description: p.description,
    }));

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error('Places autocomplete error:', err);
    return NextResponse.json({ predictions: [] });
  }
}
