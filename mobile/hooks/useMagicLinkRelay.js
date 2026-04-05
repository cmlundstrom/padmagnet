import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserRole, getUserRole } from '../lib/storage';

/**
 * Subscribes to the magic_link_relay table for a specific nonce.
 * When the desktop callback page relays tokens via the API, the Realtime
 * INSERT event fires here and completes the auth flow on the mobile device.
 *
 * Returns a cleanup function to unsubscribe.
 */
export function subscribeMagicLinkRelay(nonce, onComplete) {
  if (!nonce) return () => {};

  console.log('[MagicRelay] Subscribing for nonce:', nonce.substring(0, 8));

  const channel = supabase
    .channel(`relay:${nonce}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'magic_link_relay',
        filter: `nonce=eq.${nonce}`,
      },
      async (payload) => {
        console.log('[MagicRelay] Tokens received via Realtime');

        let accessToken, refreshToken;
        try {
          const parsed = JSON.parse(payload.new.tokens);
          accessToken = parsed.access_token;
          refreshToken = parsed.refresh_token;
        } catch (e) {
          console.error('[MagicRelay] Failed to parse tokens:', e.message);
          return;
        }

        if (!accessToken || !refreshToken) return;

        // Determine destination
        let dest;
        try {
          dest = await AsyncStorage.getItem('auth_return_to');
          if (dest) await AsyncStorage.removeItem('auth_return_to');
        } catch {}

        if (!dest) {
          const role = await getUserRole();
          dest = role === 'owner' ? '/(owner)/home' : '/(tenant)/swipe';
        }

        // Set owner role if returning to an owner path
        if (dest.startsWith('/(owner)')) {
          await saveUserRole('owner');
          try {
            const userId = JSON.parse(atob(accessToken.split('.')[1])).sub;
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: supabaseKey,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ role: 'owner' }),
            });
          } catch (e) {
            console.error('[MagicRelay] Role update failed:', e.message);
          }
        }

        // Set session (may hang — don't block)
        try {
          await Promise.race([
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
            new Promise((r) => setTimeout(() => r({ timedOut: true }), 4000)),
          ]);
        } catch (err) {
          console.error('[MagicRelay] setSession error:', err.message);
        }

        // Cleanup
        await AsyncStorage.removeItem('magic_link_nonce');
        channel.unsubscribe();
        clearTimeout(expiry);

        console.log('[MagicRelay] Navigating to:', dest);
        if (onComplete) {
          onComplete(dest);
        } else {
          router.replace(dest);
        }
      }
    )
    .subscribe((status) => {
      console.log('[MagicRelay] Subscription status:', status);
    });

  // Auto-unsubscribe after 5 minutes (matches relay table TTL)
  const expiry = setTimeout(() => {
    console.log('[MagicRelay] Subscription expired');
    channel.unsubscribe();
    AsyncStorage.removeItem('magic_link_nonce');
  }, 5 * 60 * 1000);

  return () => {
    clearTimeout(expiry);
    channel.unsubscribe();
  };
}
