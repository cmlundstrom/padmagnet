import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { getPreferences, savePreferences as saveLocal } from '../lib/storage';

export default function usePreferences() {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      // Try local cache first, then API
      const local = await getPreferences();
      if (local) setPreferences(local);

      const data = await apiFetch('/api/preferences');
      setPreferences(data);
      if (data && Object.keys(data).length > 0) {
        await saveLocal(data);
      }
    } catch {
      // Fall back to local cache (already loaded above)
      const local = await getPreferences();
      if (local) setPreferences(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates) => {
    try {
      const data = await apiFetch('/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setPreferences(data);
      await saveLocal(data);
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  return { preferences, loading, updatePreferences, refresh: fetchPreferences };
}
