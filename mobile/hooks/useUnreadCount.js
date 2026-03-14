/**
 * Realtime unread message count hook.
 *
 * Subscribes to conversations table changes and computes
 * total unread count for the current user. Used for tab badge.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

export function useUnreadCount(userId) {
  const [unreadCount, setUnreadCount] = useState(0);

  const computeUnread = useCallback((conversations) => {
    if (!userId || !conversations) return 0;
    return conversations.reduce((sum, c) => {
      const count = c.tenant_user_id === userId
        ? (c.tenant_unread_count || 0)
        : (c.owner_unread_count || 0);
      return sum + count;
    }, 0);
  }, [userId]);

  const fetchAndUpdate = useCallback(async () => {
    try {
      const data = await apiFetch('/api/conversations');
      setUnreadCount(computeUnread(data || []));
    } catch {
      // Silent — badge is non-critical
    }
  }, [computeUnread]);

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
