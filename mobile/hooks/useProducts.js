import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export default function useProducts(audience = 'owner') {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/products?audience=${audience}`);
      setProducts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const refresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refresh };
}
