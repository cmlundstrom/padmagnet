import { useState, useCallback, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Nearby Rentals hook with prefetch buffer pattern (mirrors useListings.js).
 * Caches per listingId+filters combo for 5 minutes.
 */
export default function useNearbyRentals(listingId) {
  const [listings, setListings] = useState([]);
  const [subject, setSubject] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
  const bufferRef = useRef(null);
  const filtersRef = useRef({ radius: 5, beds: null, baths: null, minSqft: null, maxSqft: null });
  const cacheRef = useRef({}); // key → { data, ts }

  const buildQueryString = useCallback((page) => {
    const f = filtersRef.current;
    const parts = [`listing_id=${listingId}`, `page=${page}`, `limit=20`, `radius=${f.radius}`];
    if (f.beds != null) parts.push(`beds=${f.beds}`);
    if (f.baths != null) parts.push(`baths=${f.baths}`);
    if (f.minSqft != null) parts.push(`min_sqft=${f.minSqft}`);
    if (f.maxSqft != null) parts.push(`max_sqft=${f.maxSqft}`);
    return parts.join('&');
  }, [listingId]);

  const cacheKey = useCallback(() => {
    const f = filtersRef.current;
    return `${listingId}:${f.radius}:${f.beds}:${f.baths}:${f.minSqft}:${f.maxSqft}`;
  }, [listingId]);

  const fetchPage = useCallback(async (pageNum) => {
    const qs = buildQueryString(pageNum);
    const data = await apiFetch(`/api/owner/nearby-rentals?${qs}`);
    return data;
  }, [buildQueryString]);

  const prefetchNext = useCallback(async (currentPage, currentHasMore) => {
    if (!currentHasMore) return;
    try {
      const result = await fetchPage(currentPage + 1);
      bufferRef.current = { page: currentPage + 1, ...result };
    } catch {
      // Non-critical
    }
  }, [fetchPage]);

  const fetchListings = useCallback(async (pageNum = 1) => {
    if (!listingId || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (pageNum === 1) setLoading(true);
      setError(null);

      // Check cache for page 1
      const key = cacheKey();
      if (pageNum === 1 && cacheRef.current[key] && (Date.now() - cacheRef.current[key].ts) < CACHE_TTL) {
        const cached = cacheRef.current[key];
        setListings(cached.data.listings || []);
        setSubject(cached.data.subject);
        setAccess(cached.data.access);
        setHasMore(cached.data.hasMore);
        pageRef.current = 1;
        prefetchNext(1, cached.data.hasMore);
        return;
      }

      const data = await fetchPage(pageNum);

      if (pageNum === 1) {
        setListings(data.listings || []);
        setSubject(data.subject);
        setAccess(data.access);
        // Cache page 1 results
        cacheRef.current[key] = { data, ts: Date.now() };
      } else {
        setListings(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          return [...prev, ...(data.listings || []).filter(l => !existingIds.has(l.id))];
        });
      }

      setHasMore(data.hasMore);
      pageRef.current = pageNum;
      bufferRef.current = null;
      prefetchNext(pageNum, data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [listingId, fetchPage, prefetchNext, cacheKey]);

  useEffect(() => {
    if (listingId) fetchListings(1);
  }, [listingId, fetchListings]);

  const loadMore = useCallback(() => {
    if (fetchingRef.current || !hasMore) return;

    const buf = bufferRef.current;
    if (buf && buf.page === pageRef.current + 1) {
      setListings(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        return [...prev, ...(buf.listings || []).filter(l => !existingIds.has(l.id))];
      });
      setHasMore(buf.hasMore);
      pageRef.current = buf.page;
      bufferRef.current = null;
      prefetchNext(buf.page, buf.hasMore);
      return;
    }

    fetchListings(pageRef.current + 1);
  }, [hasMore, fetchListings, prefetchNext]);

  const setFilters = useCallback((newFilters) => {
    filtersRef.current = { ...filtersRef.current, ...newFilters };
    setListings([]);
    pageRef.current = 1;
    bufferRef.current = null;
    fetchListings(1);
  }, [fetchListings]);

  const refresh = useCallback(() => {
    // Invalidate cache for current filters
    const key = cacheKey();
    delete cacheRef.current[key];
    setListings([]);
    pageRef.current = 1;
    bufferRef.current = null;
    setHasMore(true);
    fetchListings(1);
  }, [fetchListings, cacheKey]);

  return { listings, subject, access, loading, error, hasMore, loadMore, refresh, setFilters };
}
