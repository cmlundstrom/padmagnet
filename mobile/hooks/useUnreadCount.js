/**
 * Realtime unread message count hook.
 *
 * Subscribes to conversations table changes and computes
 * total unread count for the current user. Used for tab badge.
 * Only counts non-archived conversations.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

export function useUnreadCount(userId) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAndUpdate = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiFetch('/api/conversations?tab=unread');
      setUnreadCount((data || []).length);
    } catch {
      // Silent — badge is non-critical
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;
    fetchAndUpdate();
  }, [userId, fetchAndUpdate]);

  // Realtime: re-fetch when conversations table changes (unread counts update)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => fetchAndUpdate()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchAndUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchAndUpdate]);

  return unreadCount;
}
