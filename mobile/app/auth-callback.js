import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { resolvePostLoginDestination } from '../lib/routing';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';

/**
 * Extract tokens from any URL format — handles custom schemes,
 * Intent URIs, query params, and hash fragments.
 */
function extractTokens(url) {
  if (!url) return null;

  // Try standard URL parsing first
  try {
    const parsed = new URL(url);
    let at = parsed.searchParams.get('access_token');
    let rt = parsed.searchParams.get('refresh_token');
    if (at && rt) return { access_token: at, refresh_token: rt };

    // Try hash fragment
    if (parsed.hash) {
      const hp = new URLSearchParams(parsed.hash.substring(1));
      at = hp.get('access_token');
      rt = hp.get('refresh_token');
      if (at && rt) return { access_token: at, refresh_token: rt };
    }
  } catch {}

  // Fallback: manual string parsing (handles custom schemes that fail URL())
  try {
    const qIdx = url.indexOf('?');
    const hIdx = url.indexOf('#');

    // Try query string
    if (qIdx !== -1) {
      const end = hIdx > qIdx ? hIdx : url.length;
      const qs = url.substring(qIdx + 1, end);
      const params = new URLSearchParams(qs);
      const at = params.get('access_token');
      const rt = params.get('refresh_token');
      if (at && rt) return { access_token: at, refresh_token: rt };
    }

    // Try hash
    if (hIdx !== -1) {
      const hs = url.substring(hIdx + 1);
      const params = new URLSearchParams(hs);
      const at = params.get('access_token');
      const rt = params.get('refresh_token');
      if (at && rt) return { access_token: at, refresh_token: rt };
    }
  } catch {}

  return null;
}

export default function AuthCallbackScreen() {
  const handled = useRef(false);

  useEffect(() => {
    async function handleCallback(url) {
      if (!url || handled.current) return;
      console.log('[AuthCallback] Processing URL:', url.substring(0, 80) + '...');

      const tokens = extractTokens(url);
      if (!tokens) {
        console.log('[AuthCallback] No tokens found in URL');
        // Don't mark as handled yet — let the timeout check for session
        return;
      }

      handled.current = true;
      console.log('[AuthCallback] Tokens found, setting session...');

      try {
        const { error } = await supabase.auth.setSession(tokens);
        if (error) {
          console.error('[AuthCallback] setSession error:', error.message);
          throw error;
        }
        console.log('[AuthCallback] Session set successfully');

        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthCallback] Session user:', session?.user?.email || session?.user?.id);

        const dest = await resolvePostLoginDestination(session);
        console.log('[AuthCallback] Navigating to:', dest);
        router.replace(dest);
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        router.replace('/welcome');
      }
    }

    // Check initial URL (app opened via deep link)
    Linking.getInitialURL().then((initialUrl) => {
      console.log('[AuthCallback] Initial URL:', initialUrl ? initialUrl.substring(0, 80) + '...' : 'null');
      if (initialUrl) handleCallback(initialUrl);
    });

    // Listen for URL events (app was already running)
    const sub = Linking.addEventListener('url', (event) => {
      console.log('[AuthCallback] URL event:', event.url?.substring(0, 80) + '...');
      handleCallback(event.url);
    });

    // Safety timeout — check if session was established by another means
    const timeout = setTimeout(() => {
      if (!handled.current) {
        handled.current = true;
        console.log('[AuthCallback] Timeout — checking existing session');
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && !session.user?.is_anonymous) {
            console.log('[AuthCallback] Found authenticated session, routing...');
            resolvePostLoginDestination(session).then(dest => router.replace(dest));
          } else {
            console.log('[AuthCallback] No authenticated session, going to welcome');
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
