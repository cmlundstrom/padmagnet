import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';

// Module-level cache — shared across all component instances
let cachedFields = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function groupBySection(fields) {
  const grouped = {};
  for (const field of fields) {
    if (!grouped[field.section]) grouped[field.section] = [];
    grouped[field.section].push(field);
  }
  return grouped;
}

export default function useDisplayFields() {
  const [fields, setFields] = useState(cachedFields || []);
  const [loading, setLoading] = useState(!cachedFields);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchFields = useCallback(async (force = false) => {
    // Use cache if fresh
    if (!force && cachedFields && Date.now() - cacheTimestamp < CACHE_TTL) {
      setFields(cachedFields);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/display-fields');
      cachedFields = data || [];
      cacheTimestamp = Date.now();
      if (mountedRef.current) {
        setFields(cachedFields);
      }
    } catch (err) {
      // Fall back to cached data on error
      if (cachedFields && mountedRef.current) {
        setFields(cachedFields);
      }
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFields();
    return () => { mountedRef.current = false; };
  }, [fetchFields]);

  const fieldsBySection = groupBySection(fields);

  return { fields, fieldsBySection, loading, error, refresh: () => fetchFields(true) };
}
