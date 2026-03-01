// API client for Next.js backend routes on padmagnet.com
// Attaches Supabase JWT for authenticated requests

import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com';

export async function apiFetch(path, options = {}) {
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
