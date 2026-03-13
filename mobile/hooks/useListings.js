import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { AppState } from 'react-native';
import { apiFetch } from '../lib/api';
import { AuthContext } from '../providers/AuthProvider';

export default function useListings() {
  const { session } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
  const bufferRef = useRef(null); // prefetched next page waiting to be appended

  const fetchPage = useCallback(async (pageNum) => {
    const data = await apiFetch(`/api/listings?page=${pageNum}&limit=20`);
    return { listings: data.listings || [], hasMore: data.hasMore };
  }, []);

  // Prefetch next page into buffer (silent, no state changes)
  const prefetchNext = useCallback(async (currentPage, currentHasMore) => {
    if (!currentHasMore) return;
    try {
      const result = await fetchPage(currentPage + 1);
      bufferRef.current = { page: currentPage + 1, ...result };
    } catch {
      // Non-critical — we'll fetch on demand if prefetch fails
    }
  }, [fetchPage]);

  const fetchListings = useCallback(async (pageNum = 1) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      // Only show loading spinner on initial load
      if (pageNum === 1) setLoading(true);
      setError(null);

      const data = await fetchPage(pageNum);

      if (pageNum === 1) {
        setListings(data.listings);
      } else {
        setListings(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          return [...prev, ...data.listings.filter(l => !existingIds.has(l.id))];
        });
      }

      setHasMore(data.hasMore);
      pageRef.current = pageNum;
      bufferRef.current = null;

      // Immediately start prefetching the next page
      prefetchNext(pageNum, data.hasMore);
    } catch (err) {
      if (err.message?.includes('Authorization') || err.message?.includes('Unauthorized')) {
        setError(null);
        setHasMore(false);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchPage, prefetchNext]);

  // Fetch listings once auth session is ready (or when it changes, e.g. hot reload)
  useEffect(() => {
    if (!session) return;
    fetchListings(1);
  }, [session, fetchListings]);

  // Re-fetch listings when app returns to foreground (warm start)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && session) {
        setListings([]);
        pageRef.current = 1;
        setHasMore(true);
        bufferRef.current = null;
        fetchListings(1);
      }
    });
    return () => sub.remove();
  }, [session, fetchListings]);

  const loadMore = useCallback(() => {
    if (fetchingRef.current || !hasMore) return;

    // If we already have the next page buffered, flush it instantly
    const buf = bufferRef.current;
    if (buf && buf.page === pageRef.current + 1) {
      setListings(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        return [...prev, ...buf.listings.filter(l => !existingIds.has(l.id))];
      });
      setHasMore(buf.hasMore);
      pageRef.current = buf.page;
      bufferRef.current = null;

      // Prefetch the page after the one we just flushed
      prefetchNext(buf.page, buf.hasMore);
      return;
    }

    // No buffer — fetch on demand (fallback)
    fetchListings(pageRef.current + 1);
  }, [hasMore, fetchListings, prefetchNext]);

  const refresh = useCallback(() => {
    setListings([]);
    pageRef.current = 1;
    setHasMore(true);
    bufferRef.current = null;
    fetchListings(1);
  }, [fetchListings]);

  const removeFromDeck = useCallback((listingId) => {
    setListings(prev => prev.filter(l => l.id !== listingId));
  }, []);

  const prependToList = useCallback((listing) => {
    setListings(prev => [listing, ...prev.filter(l => l.id !== listing.id)]);
  }, []);

  return { listings, loading, error, hasMore, loadMore, refresh, removeFromDeck, prependToList };
}
