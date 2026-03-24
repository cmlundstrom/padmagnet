import { useState, useCallback, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

/**
 * Nearby Rentals hook.
 * Two modes:
 * - listingId provided: query by listing ownership
 * - { lat, lng } provided (no listingId): query by coordinates (free, no paywall)
 */
export default function useNearbyRentals(listingId, { lat, lng } = {}) {
  const [listings, setListings] = useState([]);
  const [subject, setSubject] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFiltersState] = useState({ radius: 5, beds: null, baths: null });

  const pageRef = useRef(1);
  const abortRef = useRef(null);

  const isCoordMode = !listingId && lat != null && lng != null;
  const canFetch = !!listingId || isCoordMode;

  // Build query string from current state
  const buildUrl = useCallback((page, currentFilters) => {
    const parts = [];
    if (listingId) {
      parts.push(`listing_id=${listingId}`);
    } else if (lat != null && lng != null) {
      parts.push(`lat=${lat}`, `lng=${lng}`);
    }
    parts.push(`page=${page}`, `limit=20`, `radius=${currentFilters.radius}`);
    if (currentFilters.beds != null) parts.push(`beds=${currentFilters.beds}`);
    if (currentFilters.baths != null) parts.push(`baths=${currentFilters.baths}`);
    return `/api/owner/nearby-rentals?${parts.join('&')}`;
  }, [listingId, lat, lng]);

  // Core fetch — always uses latest filters from param
  const doFetch = useCallback(async (page, currentFilters, append = false) => {
    if (!canFetch) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.cancelled = true;
    const thisRequest = { cancelled: false };
    abortRef.current = thisRequest;

    if (!append) setLoading(true);
    setError(null);

    try {
      const url = buildUrl(page, currentFilters);
      console.log('[NearbyRentals] Fetching:', url);
      const data = await apiFetch(url);
      console.log('[NearbyRentals] Got', data.listings?.length, 'listings, hasMore:', data.hasMore);

      if (thisRequest.cancelled) return;

      if (append) {
        setListings(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          return [...prev, ...(data.listings || []).filter(l => !existingIds.has(l.id))];
        });
      } else {
        setListings(data.listings || []);
        setSubject(data.subject);
        setAccess(data.access);
      }

      setHasMore(data.hasMore);
      pageRef.current = page;
    } catch (err) {
      if (!thisRequest.cancelled) setError(err.message);
    } finally {
      if (!thisRequest.cancelled) setLoading(false);
    }
  }, [canFetch, buildUrl]);

  // Initial fetch when mode activates
  useEffect(() => {
    if (canFetch) doFetch(1, filters);
  }, [canFetch]); // intentionally only on canFetch change, not filters

  // Re-fetch when filters change (after initial load)
  const setFilters = useCallback((newFilters) => {
    console.log('[NearbyRentals] setFilters called with:', JSON.stringify(newFilters));
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      console.log('[NearbyRentals] Updated filters:', JSON.stringify(updated));
      // Re-fetch with new filters (keep current listings visible until new ones arrive)
      pageRef.current = 1;
      doFetch(1, updated);
      return updated;
    });
  }, [doFetch]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    doFetch(pageRef.current + 1, filters, true);
  }, [loading, hasMore, doFetch, filters]);

  const refresh = useCallback(() => {
    setListings([]);
    pageRef.current = 1;
    doFetch(1, filters);
  }, [doFetch, filters]);

  return { listings, subject, access, loading, error, hasMore, loadMore, refresh, setFilters };
}
