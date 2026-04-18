import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { resolvePostLoginDestination } from '../lib/routing';
import { getUserRole, saveUserRole } from '../lib/storage';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    async function processTokens(accessToken, refreshToken, source) {
      if (handled.current || !accessToken || !refreshToken) return;
      handled.current = true;

      console.log(`[AuthCallback] Tokens found via ${source}, setting session...`);

      // Determine destination before anything else
      let dest;
      try {
        dest = await AsyncStorage.getItem('auth_return_to');
        if (dest) await AsyncStorage.removeItem('auth_return_to');
      } catch {}

      if (!dest) {
        const role = await getUserRole();
        dest = role === 'owner' ? '/(owner)/home' : '/(tenant)/swipe';
      }

      // Role assignment now happens upstream:
      //   - New signups: handle_new_user trigger reads user_metadata.role that
      //     signInWithMagicLink sets from the AuthBottomSheet context
      //   - Existing users changing role: RoleSwitcher.handleSwitch (commit 7843bb5)
      //
      // The previous unconditional PATCH here was corrupting profiles by
      // mutating `role` without touching `roles[]`, producing states like
      // role='owner' with roles=['tenant']. Removed 2026-04-18 as Phase 1 of
      // the dual-role foundational correction (task #23).

      // Set session (may hang — don't block on it)
      try {
        const setSessionResult = await Promise.race([
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
          new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 4000)),
        ]);
        if (setSessionResult.timedOut) {
          console.log('[AuthCallback] setSession timed out — navigating anyway');
        } else {
          console.log('[AuthCallback] Session set successfully');
        }
      } catch (err) {
        console.error('[AuthCallback] setSession error:', err);
      }

      console.log('[AuthCallback] Navigating to:', dest);
      router.replace(dest);
    }

    // Method 1: Expo Router search params (most reliable for deep links)
    if (params.access_token && params.refresh_token) {
      processTokens(params.access_token, params.refresh_token, 'searchParams');
      return;
    }

    // Method 2: Linking.getInitialURL (backup — cold start)
    Linking.getInitialURL().then((url) => {
      if (!url || handled.current) return;
      console.log('[AuthCallback] Trying initialURL:', url.substring(0, 80));
      const tokens = extractTokensFromUrl(url);
      if (tokens) {
        processTokens(tokens.at, tokens.rt, 'initialURL');
      }
    });

    // Method 3: URL event listener (backup — app already running)
    const sub = Linking.addEventListener('url', (event) => {
      if (!event.url || handled.current) return;
      console.log('[AuthCallback] URL event:', event.url.substring(0, 80));
      const tokens = extractTokensFromUrl(event.url);
      if (tokens) {
        processTokens(tokens.at, tokens.rt, 'urlEvent');
      }
    });

    return () => sub.remove();
  }, [params.access_token, params.refresh_token]);

  // Timeout: if tokens weren't processed after 5s, check session and route back
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (handled.current) return;
      handled.current = true;
      console.log('[AuthCallback] Timeout — checking session and returnTo');

      try {
        // Check for saved return path first
        const returnTo = await AsyncStorage.getItem('auth_return_to');
        await AsyncStorage.removeItem('auth_return_to');
        console.log('[AuthCallback] Timeout returnTo:', returnTo);

        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthCallback] Timeout session:', session?.user?.email || 'anonymous');

        if (returnTo) {
          router.replace(returnTo);
        } else if (session && !session.user?.is_anonymous) {
          const dest = await resolvePostLoginDestination(session);
          router.replace(dest);
        } else {
          const role = await getUserRole();
          router.replace(role === 'owner' ? '/(owner)/home' : '/(tenant)/swipe');
        }
      } catch (err) {
        console.error('[AuthCallback] Timeout error:', err);
        router.replace('/(owner)/home');
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

/** Manual URL token extraction — handles custom schemes that break new URL() */
function extractTokensFromUrl(url) {
  if (!url) return null;
  try {
    // Try query string
    const qIdx = url.indexOf('?');
    if (qIdx !== -1) {
      const hIdx = url.indexOf('#', qIdx);
      const qs = url.substring(qIdx + 1, hIdx > qIdx ? hIdx : undefined);
      const p = new URLSearchParams(qs);
      const at = p.get('access_token');
      const rt = p.get('refresh_token');
      if (at && rt) return { at, rt };
    }
    // Try hash fragment
    const hIdx = url.indexOf('#');
    if (hIdx !== -1) {
      const p = new URLSearchParams(url.substring(hIdx + 1));
      const at = p.get('access_token');
      const rt = p.get('refresh_token');
      if (at && rt) return { at, rt };
    }
  } catch {}
  return null;
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
