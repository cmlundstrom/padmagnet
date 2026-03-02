import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { hasOnboarded, getUserRole } from '../lib/storage';
import { COLORS } from '../constants/colors';

export default function Index() {
  const { session, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    if (loading) return;

    async function resolveDestination() {
      if (!session) {
        setDestination('/welcome');
        setChecking(false);
        return;
      }

      const role = session.user?.user_metadata?.role || await getUserRole();
      const onboarded = await hasOnboarded();

      if (role === 'tenant' && !onboarded) {
        setDestination('/onboarding');
      } else {
        setDestination('/(tabs)/swipe');
      }
      setChecking(false);
    }

    resolveDestination();
  }, [session, loading]);

  if (loading || checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
