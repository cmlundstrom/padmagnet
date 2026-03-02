import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useURL } from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { hasOnboarded, getUserRole } from '../lib/storage';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';

export default function AuthCallbackScreen() {
  const url = useURL();

  useEffect(() => {
    async function handleCallback() {
      if (!url) return;

      try {
        const parsed = new URL(url);
        const params = parsed.hash
          ? new URLSearchParams(parsed.hash.substring(1))
          : parsed.searchParams;

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        // Wait briefly for auth state to propagate
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const role = session.user?.user_metadata?.role || await getUserRole();
          const onboarded = await hasOnboarded();

          if (role === 'tenant' && !onboarded) {
            router.replace('/onboarding');
          } else {
            router.replace('/(tabs)/swipe');
          }
        } else {
          router.replace('/welcome');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        router.replace('/welcome');
      }
    }

    handleCallback();
  }, [url]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});
