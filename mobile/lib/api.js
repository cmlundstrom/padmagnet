// API client for Next.js backend routes on padmagnet.com
// Used for operations that require service_role (Bridge sync, Stripe, etc.)

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}
