// API client for Next.js backend routes on padmagnet.com
// Attaches Supabase JWT for authenticated requests

import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com';

// Cache the session token to avoid calling getSession() on every API request
let _cachedToken = null;
let _tokenExpiry = 0;
let _inflightToken = null; // dedup concurrent getToken() calls

// Clear token cache — called by AuthProvider on sign-out
export function clearTokenCache() {
  _cachedToken = null;
  _tokenExpiry = 0;
  _inflightToken = null;
}

async function getToken() {
  // Use cached token if still valid
  if (_cachedToken && Date.now() < _tokenExpiry) {
    return _cachedToken;
  }
  // If a refresh is already in-flight, reuse it instead of spawning another
  if (_inflightToken) return _inflightToken;
  // Refresh from Supabase — timeout after 2s
  _inflightToken = (async () => {
    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 2000)),
      ]);
      const token = result.data?.session?.access_token || null;
      _cachedToken = token;
      _tokenExpiry = token ? Date.now() + 55 * 60 * 1000 : 0;
      return token;
    } catch {
      return _cachedToken; // fallback to stale token
    } finally {
      _inflightToken = null;
    }
  })();
  return _inflightToken;
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();

  const { headers: optHeaders, ...rest } = options;
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...optHeaders,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}
