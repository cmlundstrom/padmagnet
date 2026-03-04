import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function useProducts(audience = 'owner') {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const fetchProducts = useCallback(async () => {
    try {
      // Only show loading spinner on first fetch
      if (!hasFetched.current) setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/products?audience=${audience}`);
      setProducts(data || []);
      hasFetched.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Refetch every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  // Realtime: re-fetch when products table changes
  useEffect(() => {
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  const refresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refresh };
}
