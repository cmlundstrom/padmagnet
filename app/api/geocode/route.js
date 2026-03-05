import { getAuthUser } from '../../../lib/auth-helpers';
import { geocodeQuery } from '../../../lib/geocode';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { query } = await request.json();
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const result = await geocodeQuery(query.trim());

    if (!result.latitude || !result.longitude) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
