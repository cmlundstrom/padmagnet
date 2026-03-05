import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { getSearchZones, saveSearchZones } from '../lib/storage';

export default function useSearchZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      // Load local cache first for fast startup
      const local = await getSearchZones();
      if (local.length > 0) setZones(local);

      const data = await apiFetch('/api/search-zones');
      setZones(data);
      await saveSearchZones(data);
    } catch {
      // Fall back to local cache
      const local = await getSearchZones();
      setZones(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addZone = useCallback(async (zone) => {
    const data = await apiFetch('/api/search-zones', {
      method: 'POST',
      body: JSON.stringify(zone),
    });
    const updated = [...zones, data];
    setZones(updated);
    await saveSearchZones(updated);
    return data;
  }, [zones]);

  const removeZone = useCallback(async (id) => {
    await apiFetch(`/api/search-zones?id=${id}`, { method: 'DELETE' });
    const updated = zones.filter(z => z.id !== id);
    setZones(updated);
    await saveSearchZones(updated);
  }, [zones]);

  const updateZone = useCallback(async (id, changes) => {
    const data = await apiFetch(`/api/search-zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
    const updated = zones.map(z => z.id === id ? data : z);
    setZones(updated);
    await saveSearchZones(updated);
    return data;
  }, [zones]);

  return { zones, loading, addZone, removeZone, updateZone, refresh };
}
