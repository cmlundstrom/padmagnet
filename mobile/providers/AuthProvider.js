import { createContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserRole, saveUserRole, clearUserRole } from '../lib/storage';
import { clearTokenCache } from '../lib/api';

export const AuthContext = createContext({
  session: null,
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth: profiles.role (DB) → AsyncStorage cache → 'tenant' fallback
  async function resolveRole(authSession) {
    if (!authSession) {
      setRole(null);
      return;
    }

    // 1. Query profiles table with 3s timeout (prevents splash hang if Supabase is slow)
    try {
      const result = await Promise.race([
        supabase.from('profiles').select('role').eq('id', authSession.user.id).single(),
        new Promise((resolve) => setTimeout(() => resolve({ data: null, timedOut: true }), 3000)),
      ]);

      if (result.data?.role) {
        setRole(result.data.role);
        await saveUserRole(result.data.role);
        return;
      }
      if (result.timedOut) {
        console.warn('[Auth] resolveRole timed out — using fallback');
      }
    } catch (err) {
      console.warn('[Auth] resolveRole query failed:', err.message);
    }

    // 2. Offline fallback: AsyncStorage cache
    const localRole = await getUserRole();
    const fallbackRole = localRole || 'tenant';
    setRole(fallbackRole);

    // New user or missing role — persist the stored role to the profile (awaited)
    if (localRole) {
      try {
        await supabase.from('profiles')
          .update({ role: localRole })
          .eq('id', authSession.user.id);
        console.log('[Auth] Synced role to profile:', localRole);
      } catch (err) {
        console.warn('[Auth] Role sync failed:', err.message);
      }
    }
  }

  useEffect(() => {
    // Get initial session — timeout after 3s to prevent startup hangs
    Promise.race([
      supabase.auth.getSession(),
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000)),
    ]).then(async ({ data: { session } }) => {
      setSession(session);
      await resolveRole(session);
      setLoading(false);
    });

    // Listen for auth changes — use setTimeout to avoid blocking
    // setSession's internal lock (which causes deadlock with DB queries)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === 'SIGNED_IN') {
        setTimeout(() => resolveRole(session), 0);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        clearUserRole();
        clearTokenCache();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
