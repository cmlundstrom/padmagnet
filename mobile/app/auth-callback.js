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
  // Reactive deep-link URL — the only way to capture the URL that triggered
  // navigation when the app was already running. Linking.getInitialURL()
  // returns null on warm-launch deep links; addEventListener attaches AFTER
  // the URL event has already fired during route transition. useURL()
  // observes both initial AND subsequent URLs, so it catches the URL whether
  // the app was cold-started by the magic link or warm-resumed by it.
  const deepLinkUrl = Linking.useURL();

  useEffect(() => {
    async function processTokens(accessToken, refreshToken, source) {
      if (handled.current || !accessToken || !refreshToken) return;
      handled.current = true;

      console.log(`[AuthCallback] Tokens found via ${source}, setting session...`);

      // Determine intended destination — auth_return_to is the intent buffer
      // stashed by AuthBottomSheet. We pass it into resolvePostLoginDestination
      // below (after setSession) so the resolver can interpose first-time
      // Edit Profile for renters who lack a display_name.
      let intendedDest;
      try {
        intendedDest = await AsyncStorage.getItem('auth_return_to');
        if (intendedDest) await AsyncStorage.removeItem('auth_return_to');
      } catch {}

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

      // Resolve final destination through the centralized router. For
      // renters without a display_name this interposes Edit Profile with
      // ?firstTime=true&next=<intendedDest>. Owners and renters with a
      // name get the intendedDest directly (or the role's default tab).
      let dest;
      try {
        const { data: { session: liveSession } } = await supabase.auth.getSession();
        dest = await resolvePostLoginDestination(liveSession, undefined, intendedDest);
      } catch (err) {
        console.warn('[AuthCallback] resolvePostLoginDestination failed, using fallback:', err.message);
        const role = await getUserRole();
        dest = intendedDest || (role === 'owner' ? '/(owner)/home' : '/(tenant)/swipe');
      }

      // Post-auth correction for the L1 "Create or Edit Your Listing" flow.
      // AuthBottomSheet.getReturnPath computes auth_return_to at magic-link
      // SEND time, when we don't yet know if this email has listings on the
      // server. For a returning owner (info@...) it routes them to the
      // Studio (/owner/create) as if they were a first-time user. Now that
      // the session is set we can check listings and correct the hop —
      // send existing owners to /(owner)/listings to manage their property.
      if (dest === '/owner/create') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            const res = await fetch(
              `${supabaseUrl}/rest/v1/listings?owner_user_id=eq.${session.user.id}&select=id&limit=1`,
              {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': supabaseKey,
                },
              }
            );
            if (res.ok) {
              const rows = await res.json();
              if (Array.isArray(rows) && rows.length > 0) {
                console.log('[AuthCallback] Returning owner has listings — redirecting to Listings tab');
                dest = '/(owner)/listings';
              }
            }
          }
        } catch (err) {
          console.warn('[AuthCallback] Listings re-check failed, using original dest:', err.message);
        }
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

  // Method 4: Linking.useURL — reactive, captures the URL on both cold and
  // warm-launch deep links. This is the only method that reliably catches
  // hash-fragment tokens (Supabase magic-link format:
  // https://padmagnet.com/auth/mobile-callback?nonce=...#access_token=...)
  // when the magic link is tapped while the app is already running. The
  // extract+process logic mirrors Methods 2 and 3; the handled.current
  // guard de-dupes if multiple methods race to a result.
  useEffect(() => {
    if (!deepLinkUrl || handled.current) return;
    console.log('[AuthCallback] useURL fired:', deepLinkUrl.substring(0, 80));
    const tokens = extractTokensFromUrl(deepLinkUrl);
    if (!tokens) return;
    // We can't call the inner processTokens (it's scoped to the effect
    // above). Re-implement the minimum: setSession + nav. The other effect
    // will short-circuit on handled.current=true.
    handled.current = true;
    (async () => {
      let intendedDest;
      try {
        intendedDest = await AsyncStorage.getItem('auth_return_to');
        if (intendedDest) await AsyncStorage.removeItem('auth_return_to');
      } catch {}
      try {
        await Promise.race([
          supabase.auth.setSession({ access_token: tokens.at, refresh_token: tokens.rt }),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
        const { data: { session } } = await supabase.auth.getSession();
        const role = session?.user?.user_metadata?.role || (await getUserRole());
        const dest = await resolvePostLoginDestination(session, role, intendedDest);
        console.log('[AuthCallback] useURL nav →', dest);
        router.replace(dest);
      } catch (err) {
        console.error('[AuthCallback] useURL setSession error:', err);
        const role = await getUserRole();
        router.replace(role === 'owner' ? '/(owner)/home' : '/(tenant)/swipe');
      }
    })();
  }, [deepLinkUrl]);

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

        if (session && !session.user?.is_anonymous) {
          // Pass returnTo as intendedDest so the resolver can interpose
          // first-time Edit Profile for renters with no display_name.
          const dest = await resolvePostLoginDestination(session, undefined, returnTo);
          router.replace(dest);
        } else if (returnTo) {
          router.replace(returnTo);
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
