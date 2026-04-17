import { createContext, useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { getUserRole, saveUserRole, clearUserRole } from '../lib/storage';
import { clearTokenCache } from '../lib/api';

export const AuthContext = createContext({
  session: null,
  user: null,
  role: null,
  roles: [],
  loading: true,
  isAnon: true,
  switchRole: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [roles, setRoles] = useState([]);
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
        supabase.from('profiles').select('role, roles').eq('id', authSession.user.id).single(),
        new Promise((resolve) => setTimeout(() => resolve({ data: null, timedOut: true }), 3000)),
      ]);

      if (result.data?.role) {
        setRole(result.data.role);
        setRoles(result.data.roles || [result.data.role]);
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
    setRoles([fallbackRole]);

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

      // Clear cached API token on any auth state change so apiFetch
      // picks up the correct JWT (critical for anon → authenticated upgrades)
      clearTokenCache();

      if (event === 'SIGNED_IN') {
        setTimeout(() => resolveRole(session), 0);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setRoles([]);
        clearUserRole();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time admin events: session invalidation + role changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`admin-events-${session.user.id}`)
      .on('broadcast', { event: 'session_killed' }, () => {
        Alert.alert(
          'Session Ended',
          'Your account has been deactivated by an administrator.',
          [{ text: 'OK' }]
        );
        supabase.auth.signOut();
      })
      .on('broadcast', { event: 'role_changed' }, (payload) => {
        const { role: newRole, roles: newRoles } = payload.payload || {};
        if (newRole) {
          setRole(newRole);
          saveUserRole(newRole);
        }
        if (newRoles) {
          setRoles(newRoles);
        }
        console.log('[Auth] Role updated by admin:', newRole, newRoles);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  // Imperative role switch for multi-role users (RoleSwitcher).
  // resolveRole only re-runs on auth state changes, so router.replace alone
  // doesn't update local role state — without this, switching tenant→owner
  // leaves role='tenant' and the next switch back is a no-op.
  const switchRole = useCallback(async (newRole) => {
    setRole(newRole);
    await saveUserRole(newRole);
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      role,
      roles,
      loading,
      // Centralized anon check — user is anonymous if:
      // no session, OR flagged anonymous AND has no email (belt + suspenders)
      isAnon: !session || (session.user?.is_anonymous === true && !session.user?.email),
      switchRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
