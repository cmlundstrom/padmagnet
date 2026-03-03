/**
 * Server-side geocoding via Google Geocoding API.
 * Used by owner listing POST/PUT to resolve lat/lng from address fields.
 */

export async function geocodeAddress(street, city, state, zip) {
  const key = process.env.GOOGLE_GEOCODING_KEY;
  if (!key) {
    console.warn('GOOGLE_GEOCODING_KEY not set — skipping geocoding');
    return { latitude: null, longitude: null };
  }

  const address = [street, city, state, zip].filter(Boolean).join(', ');
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
    );
    const data = await res.json();

    if (data.status === 'OK' && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    }

    console.warn(`Geocoding failed for "${address}": ${data.status}`);
    return { latitude: null, longitude: null };
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return { latitude: null, longitude: null };
  }
}
