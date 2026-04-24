import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';

// Module-level cache — keyed by role
const cache = { tenant: { fields: null, ts: 0 }, owner: { fields: null, ts: 0 } };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function groupBySection(fields) {
  const grouped = {};
  for (const field of fields) {
    if (!grouped[field.section]) grouped[field.section] = [];
    grouped[field.section].push(field);
  }
  return grouped;
}

// Imperative pre-warm. Call from app startup (e.g. _layout.js) so the first
// Preview-as-Renter / Listing-Detail render isn't blocked on this network
// trip. Idempotent: skips the fetch if the cache is already fresh.
export async function prefetchDisplayFields(role = 'tenant') {
  const cacheKey = role === 'owner' ? 'owner' : 'tenant';
  const c = cache[cacheKey];
  if (c.fields && Date.now() - c.ts < CACHE_TTL) return c.fields;
  try {
    const url = cacheKey === 'owner' ? '/api/display-fields?role=owner' : '/api/display-fields';
    const data = await apiFetch(url);
    cache[cacheKey] = { fields: data || [], ts: Date.now() };
    return cache[cacheKey].fields;
  } catch {
    return c.fields || [];
  }
}

export default function useDisplayFields(role = 'tenant') {
  const cacheKey = role === 'owner' ? 'owner' : 'tenant';
  const cached = cache[cacheKey];
  const [fields, setFields] = useState(cached.fields || []);
  const [loading, setLoading] = useState(!cached.fields);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchFields = useCallback(async (force = false) => {
    const c = cache[cacheKey];
    // Use cache if fresh
    if (!force && c.fields && Date.now() - c.ts < CACHE_TTL) {
      setFields(c.fields);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const url = cacheKey === 'owner' ? '/api/display-fields?role=owner' : '/api/display-fields';
      const data = await apiFetch(url);
      cache[cacheKey] = { fields: data || [], ts: Date.now() };
      if (mountedRef.current) {
        setFields(cache[cacheKey].fields);
      }
    } catch (err) {
      // Fall back to cached data on error
      if (cache[cacheKey].fields && mountedRef.current) {
        setFields(cache[cacheKey].fields);
      }
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    mountedRef.current = true;
    fetchFields();
    return () => { mountedRef.current = false; };
  }, [fetchFields]);

  const fieldsBySection = groupBySection(fields);

  return { fields, fieldsBySection, loading, error, refresh: () => fetchFields(true) };
}
