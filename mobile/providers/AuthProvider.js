import { createContext, useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { getUserRole, saveUserRole, clearUserRole } from '../lib/storage';
import { clearTokenCache, apiFetch } from '../lib/api';

export const AuthContext = createContext({
  session: null,
  user: null,
  role: null,
  roles: [],
  loading: true,
  isAnon: true,
  archivedAt: null,
  displayName: null,
  switchRole: async () => {},
  reactivateAccount: async () => {},
  dismissReactivation: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivedAt, setArchivedAt] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  // Single source of truth: profiles.role (DB) → AsyncStorage cache → 'tenant' fallback.
  // Also reads archived_at + display_name so the Welcome-Back gate can fire
  // for returning users whose admin-archived row was preserved.
  async function resolveRole(authSession) {
    if (!authSession) {
      setRole(null);
      setArchivedAt(null);
      setDisplayName(null);
      return;
    }

    // Anonymous sessions never have a profile row to read — skip the probe
    // entirely so we don't surface a spurious "archived" state for them.
    if (authSession.user?.is_anonymous) {
      setArchivedAt(null);
      setDisplayName(null);
    }

    // 1. Query profiles table with 3s timeout (prevents splash hang if Supabase is slow)
    try {
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('role, roles, archived_at, display_name')
          .eq('id', authSession.user.id)
          .single(),
        new Promise((resolve) => setTimeout(() => resolve({ data: null, timedOut: true }), 3000)),
      ]);

      if (result.data?.role) {
        setRole(result.data.role);
        setRoles(result.data.roles || [result.data.role]);
        setArchivedAt(result.data.archived_at || null);
        setDisplayName(result.data.display_name || null);
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

  // Imperative role switch. Callers pass newRoles when the set has changed
  // (e.g. /settings/add-role just grew roles[] server-side — without updating
  // the context here, any consumer reading roles[] will see stale data until
  // the next auth state change fires resolveRole). RoleSwitcher/Profile CTAs
  // that only change active role can omit newRoles.
  const switchRole = useCallback(async (newRole, newRoles) => {
    setRole(newRole);
    if (newRoles) setRoles(newRoles);
    await saveUserRole(newRole);
  }, []);

  // Self-service reactivation. Calls /api/account/reactivate, which nulls
  // profiles.archived_at server-side, then clears the local flag so the
  // Welcome-Back gate dismisses without waiting for the next resolveRole
  // tick. Throws on failure so the modal can surface the error inline.
  const reactivateAccount = useCallback(async () => {
    await apiFetch('/api/account/reactivate', { method: 'POST' });
    setArchivedAt(null);
  }, []);

  // "Not now" path — sign out so the archived user doesn't sit in app with
  // an inconsistent state (signed in but archived). Local archivedAt clears
  // via the SIGNED_OUT branch of onAuthStateChange resetting state.
  const dismissReactivation = useCallback(async () => {
    setArchivedAt(null);
    await clearUserRole();
    await supabase.auth.signOut();
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
      archivedAt,
      displayName,
      switchRole,
      reactivateAccount,
      dismissReactivation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
