import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { resolvePostLoginDestination } from '../lib/routing';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';

export default function AuthCallbackScreen() {
  const handled = useRef(false);

  useEffect(() => {
    async function handleCallback(url) {
      if (!url || handled.current) return;
      handled.current = true;

      try {
        // Parse tokens from query params or hash fragment
        let accessToken, refreshToken;

        // Try query params first (Intent URIs pass tokens as query params)
        const parsed = new URL(url);
        accessToken = parsed.searchParams.get('access_token');
        refreshToken = parsed.searchParams.get('refresh_token');

        // Fall back to hash fragment (web redirects use this)
        if (!accessToken && parsed.hash) {
          const hashParams = new URLSearchParams(parsed.hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        // Resolve destination
        const { data: { session } } = await supabase.auth.getSession();
        const dest = await resolvePostLoginDestination(session);
        router.replace(dest);
      } catch (err) {
        console.error('Auth callback error:', err);
        router.replace('/welcome');
      }
    }

    // Check initial URL (app was opened via deep link)
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleCallback(initialUrl);
    });

    // Also listen for URL events (app was already open)
    const sub = Linking.addEventListener('url', (event) => {
      handleCallback(event.url);
    });

    // Safety timeout — if nothing happens in 8 seconds, go to welcome
    const timeout = setTimeout(() => {
      if (!handled.current) {
        handled.current = true;
        // Check if we already have a session (auth may have completed via listener)
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            resolvePostLoginDestination(session).then(dest => router.replace(dest));
          } else {
            router.replace('/welcome');
          }
        });
      }
    }, 8000);

    return () => {
      sub.remove();
      clearTimeout(timeout);
    };
  }, []);

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
