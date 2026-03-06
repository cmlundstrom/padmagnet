import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export default function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchListings = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/listings?page=${pageNum}&limit=20`);
      const newListings = data.listings || [];

      if (append) {
        setListings(prev => [...prev, ...newListings]);
      } else {
        setListings(newListings);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      // Don't show auth errors as errors — user may not be signed in yet
      if (err.message?.includes('Authorization') || err.message?.includes('Unauthorized')) {
        setError(null);
        setHasMore(false);
        setLoading(false);
        return;
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(1);
  }, [fetchListings]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchListings(page + 1, true);
    }
  }, [loading, hasMore, page, fetchListings]);

  const refresh = useCallback(() => {
    setListings([]);
    setPage(1);
    setHasMore(true);
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
