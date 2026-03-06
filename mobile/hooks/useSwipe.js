import { useCallback } from 'react';
import { useAlert } from '../providers/AlertProvider';
import { apiFetch } from '../lib/api';

export default function useSwipe() {
  const alert = useAlert();

  const recordSwipe = useCallback(async (listingId, direction, padscore) => {
    try {
      await apiFetch('/api/swipes', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listingId,
          direction,
          padscore: Math.round(padscore),
        }),
      });
      return true;
    } catch (err) {
      console.warn('Failed to record swipe:', err.message);
      alert('Swipe not saved', err.message);
      return false;
    }
  }, [alert]);

  const undoSwipe = useCallback(async (listingId) => {
    try {
      await apiFetch('/api/swipes', {
        method: 'DELETE',
        body: JSON.stringify({ listing_id: listingId }),
      });
      return true;
    } catch (err) {
      console.warn('Failed to undo swipe:', err.message);
      return false;
    }
  }, []);

  return { recordSwipe, undoSwipe };
}
