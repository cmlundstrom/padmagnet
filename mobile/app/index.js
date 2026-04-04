import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { resolvePostLoginDestination } from '../lib/routing';
import { getUserRole, hasSelectedRole } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/colors';

export default function Index() {
  const { session, role, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    if (loading) return;

    async function resolve() {
      // If no session but user previously selected renter role, create anonymous session
      if (!session) {
        const roleSelected = await hasSelectedRole();
        const savedRole = await getUserRole();

        if (roleSelected && (savedRole === 'tenant' || savedRole === 'owner')) {
          // Create anonymous session for returning user (renter or owner)
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error && data?.session) {
            // Mark as anonymous with correct role
            await supabase.from('profiles').update({ is_anonymous: true, role: savedRole }).eq('id', data.session.user.id);
            // AuthProvider will pick up the new session and re-render
            return; // useAuth will re-trigger this effect
          }
        }
      }

      const dest = await resolvePostLoginDestination(session, role);
      setDestination(dest);
      setChecking(false);
    }

    resolve();
  }, [session, role, loading]);

  if (loading || checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
