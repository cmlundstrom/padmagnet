import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { resolvePostLoginDestination } from '../lib/routing';
import { COLORS } from '../constants/colors';

export default function Index() {
  const { session, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    if (loading) return;

    resolvePostLoginDestination(session).then((dest) => {
      setDestination(dest);
      setChecking(false);
    });
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
