import { useState, useCallback, useContext } from 'react';
import { AuthContext } from '../providers/AuthProvider';
import { apiFetch } from '../lib/api';
import usePadPoints, { PADPOINTS } from './usePadPoints';
import useRenterTier from './useRenterTier';

/**
 * Ask Pad hook — manages chat state and query execution.
 * Enforces tier limits client-side before making API calls.
 * Awards PadPoints on successful on-topic queries.
 */
export default function useAskPad({ deviceLat, deviceLng } = {}) {
  const { user } = useContext(AuthContext);
  const padPoints = usePadPoints();
  const renterTier = useRenterTier();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const sendQuery = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return;

    // Client-side tier limit check
    if (!renterTier.canQuery) {
      if (renterTier.cooldownMinutes > 0) {
        setMessages(prev => [...prev, {
          role: 'pad',
          type: 'cooldown',
          text: `You're in a brief cooldown. Try again in ${renterTier.cooldownMinutes} minute${renterTier.cooldownMinutes !== 1 ? 's' : ''}.`,
        }]);
        return;
      }
      setMessages(prev => [...prev, {
        role: 'pad',
        type: 'limit_reached',
        text: "You've used all your AskPad FREE Ai-powered queries. Upgrade for more! Or, continue for free using your PadScore.",
      }]);
      setShowUpgrade(true);
      return;
    }

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    try {
      const result = await apiFetch('/api/ask-pad', {
        method: 'POST',
        body: JSON.stringify({ query, lat: deviceLat || null, lng: deviceLng || null }),
      });

      // Add Ask Pad response
      setMessages(prev => [...prev, {
        role: 'pad',
        type: result.type || 'text',
        text: result.message,
        listings: result.listings || null,
        actions: result.actions || null,
        queriesUsed: result.queriesUsed,
        dailyLimit: result.dailyLimit,
        abuseWarning: result.abuseWarning || null,
      }]);

      // Award PadPoints only on successful on-topic queries (not rebuffs/errors/cooldowns)
      if (result.type === 'text' || result.type === 'listings') {
        padPoints.earnPoints(3, 'Ask Pad query');
      }

      // Refresh tier data (query count changed)
      renterTier.refresh();
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'pad',
        type: 'error',
        text: 'Something went wrong. Try again!',
      }]);
    }

    setLoading(false);
  }, [user, renterTier, padPoints]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    showUpgrade,
    setShowUpgrade,
    sendQuery,
    clearChat,
    remainingQueries: renterTier.remainingQueries,
    dailyLimit: renterTier.dailyLimit,
    tier: renterTier.tier,
  };
}
