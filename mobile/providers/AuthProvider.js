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

  async function resolveRole(authSession) {
    if (!authSession) {
      setRole(null);
      return;
    }
    // Prefer user_metadata, fall back to local storage
    const metaRole = authSession.user?.user_metadata?.role;
    if (metaRole) {
      setRole(metaRole);
      await saveUserRole(metaRole);
    } else {
      const localRole = await getUserRole();
      setRole(localRole);
    }
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
