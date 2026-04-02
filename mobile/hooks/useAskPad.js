import { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../providers/AuthProvider';
import { apiFetch } from '../lib/api';
import { getAskPadChat, saveAskPadChat, clearAskPadChat } from '../lib/storage';
import usePadPoints, { PADPOINTS } from './usePadPoints';
import useRenterTier from './useRenterTier';

const MAX_MESSAGES = 50;
const SYNC_DEBOUNCE_MS = 5000;

/**
 * Ask Pad hook — manages chat state and query execution.
 * Hybrid persistence: AsyncStorage (instant) + Supabase (cloud backup).
 */
export default function useAskPad({ deviceLat, deviceLng } = {}) {
  const { user } = useContext(AuthContext);
  const padPoints = usePadPoints();
  const renterTier = useRenterTier();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const syncTimerRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // ── Load from AsyncStorage on mount, then background-sync from Supabase ──
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      // 1. Instant load from local storage
      const local = await getAskPadChat(user.id);
      if (!cancelled && local.length > 0) {
        setMessages(local);
      }
      setHydrated(true);

      // 2. Background fetch from Supabase — use whichever is newer
      try {
        const remote = await apiFetch('/api/ask-pad/history');
        if (cancelled) return;

        if (remote.messages?.length > 0) {
          const localTs = local.length > 0 ? (local[local.length - 1]?.ts || 0) : 0;
          const remoteTs = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;

          if (remoteTs > localTs && remote.messages.length > 0) {
            setMessages(remote.messages);
            await saveAskPadChat(user.id, remote.messages);
          } else if (local.length > 0 && localTs > remoteTs) {
            // Local is newer — push to cloud
            syncToCloud(local);
          }
        } else if (local.length > 0) {
          // Nothing in cloud yet — push local up
          syncToCloud(local);
        }
      } catch {
        // Offline or API error — local data is fine
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Debounced sync to Supabase ──
  const syncToCloud = useCallback((msgs) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        await apiFetch('/api/ask-pad/history', {
          method: 'PUT',
          body: JSON.stringify({ messages: msgs || messagesRef.current }),
        });
      } catch {
        // Silent fail — next message will retry
      }
    }, SYNC_DEBOUNCE_MS);
  }, []);

  // ── Persist helper: save locally + schedule cloud sync ──
  const persistMessages = useCallback((msgs) => {
    if (!user?.id) return;
    const capped = msgs.slice(-MAX_MESSAGES);
    saveAskPadChat(user.id, capped);
    syncToCloud(capped);
  }, [user?.id, syncToCloud]);

  const sendQuery = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return;

    // Client-side tier limit check
    if (!renterTier.canQuery) {
      if (renterTier.cooldownMinutes > 0) {
        const cooldownMsg = {
          role: 'pad',
          type: 'cooldown',
          text: `You're in a brief cooldown. Try again in ${renterTier.cooldownMinutes} minute${renterTier.cooldownMinutes !== 1 ? 's' : ''}.`,
          ts: Date.now(),
        };
        setMessages(prev => {
          const next = [...prev, cooldownMsg];
          persistMessages(next);
          return next;
        });
        return;
      }
      const limitMsg = {
        role: 'pad',
        type: 'limit_reached',
        text: "You've used all your AskPad FREE Ai-powered queries. Upgrade for more! Or, continue for free using your PadScore.",
        ts: Date.now(),
      };
      setMessages(prev => {
        const next = [...prev, limitMsg];
        persistMessages(next);
        return next;
      });
      setShowUpgrade(true);
      return;
    }

    // Add user message
    const userMsg = { role: 'user', text: query, ts: Date.now() };
    setMessages(prev => {
      const next = [...prev, userMsg];
      persistMessages(next);
      return next;
    });
    setLoading(true);

    try {
      // Send last 6 messages for conversation context (3 exchanges)
      const recentHistory = messagesRef.current
        .filter(m => m.role === 'user' || (m.role === 'pad' && (m.type === 'text' || m.type === 'listings')))
        .slice(-6)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

      const result = await apiFetch('/api/ask-pad', {
        method: 'POST',
        body: JSON.stringify({ query, lat: deviceLat || null, lng: deviceLng || null, history: recentHistory }),
      });

      // Add Ask Pad response
      const padMsg = {
        role: 'pad',
        type: result.type || 'text',
        text: result.message,
        listings: result.listings || null,
        actions: result.actions || null,
        queriesUsed: result.queriesUsed,
        dailyLimit: result.dailyLimit,
        abuseWarning: result.abuseWarning || null,
        ts: Date.now(),
      };
      setMessages(prev => {
        const next = [...prev, padMsg];
        persistMessages(next);
        return next;
      });

      // Award PadPoints only on successful on-topic queries (not rebuffs/errors/cooldowns)
      if (result.type === 'text' || result.type === 'listings') {
        padPoints.earnPoints(3, 'Ask Pad query');
      }

      // Refresh tier data (query count changed)
      renterTier.refresh();
    } catch (err) {
      const errMsg = {
        role: 'pad',
        type: 'error',
        text: 'Something went wrong. Try again!',
        ts: Date.now(),
      };
      setMessages(prev => {
        const next = [...prev, errMsg];
        persistMessages(next);
        return next;
      });
    }

    setLoading(false);
  }, [user, renterTier, padPoints, persistMessages]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    if (user?.id) {
      await clearAskPadChat(user.id);
      // Clear cloud too (immediate, no debounce)
      try {
        await apiFetch('/api/ask-pad/history', {
          method: 'PUT',
          body: JSON.stringify({ messages: [] }),
        });
      } catch {
        // Silent
      }
    }
  }, [user?.id]);

  return {
    messages,
    loading,
    showUpgrade,
    setShowUpgrade,
    sendQuery,
    clearChat,
    hydrated,
    remainingQueries: renterTier.remainingQueries,
    dailyLimit: renterTier.dailyLimit,
    tier: renterTier.tier,
  };
}
