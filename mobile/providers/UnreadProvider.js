/**
 * Unread count provider — single source of truth for the Messages tab badge.
 *
 * Fetches on mount and whenever a consumer calls refresh() (e.g. MessagesScreen
 * on focus). Also listens to realtime conversation/message changes as the fast
 * path, but focus-based refresh is what keeps the badge honest when realtime
 * drops or misses an event.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { AuthContext } from './AuthProvider';

const UnreadContext = createContext({
  unreadCount: 0,
  refresh: async () => {},
  setUnreadCount: () => {},
});

export function UnreadProvider({ children }) {
  const { session } = useContext(AuthContext);
  const userId = session?.user?.id ?? null;
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiFetch('/api/conversations?tab=unread');
      setUnreadCount((data || []).length);
    } catch {
      // Silent — badge is non-critical.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    refresh();
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refresh, setUnreadCount }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
