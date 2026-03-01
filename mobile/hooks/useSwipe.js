import { useCallback } from 'react';
import { apiFetch } from '../lib/api';

export default function useSwipe() {
  const recordSwipe = useCallback(async (listingId, direction, padscore) => {
    try {
      await apiFetch('/api/swipes', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listingId,
          direction,
          padscore,
        }),
      });
    } catch (err) {
      console.warn('Failed to record swipe:', err.message);
    }
  }, []);

  return { recordSwipe };
}
