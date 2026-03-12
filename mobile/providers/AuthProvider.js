import { createContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserRole, saveUserRole, clearUserRole } from '../lib/storage';

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

    // 1. Query profiles table (single source of truth)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authSession.user.id)
      .single();

    if (profile?.role) {
      setRole(profile.role);
      await saveUserRole(profile.role);
      return;
    }

    // 2. Offline fallback: AsyncStorage cache
    const localRole = await getUserRole();
    setRole(localRole || 'tenant');
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await resolveRole(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === 'SIGNED_IN') {
        await resolveRole(session);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        await clearUserRole();
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
