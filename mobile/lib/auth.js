import { supabase } from './supabase';
import { clearUserRole } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const PENDING_ANON_MIGRATION_KEY = 'pending_anon_migration_user_id';

// Capture the current anonymous user_id (if any) BEFORE kicking off
// signIn / signUp / magic-link. The session is replaced on successful
// auth, so this is our only window to remember the anon identity. The
// AuthProvider's SIGNED_IN handler then fires the migration POST.
//
// Safe to call when no anon session exists — silent no-op.
export async function captureAnonUserIdIfPending() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.is_anonymous) {
      await AsyncStorage.setItem(PENDING_ANON_MIGRATION_KEY, session.user.id);
    }
  } catch (err) {
    console.warn('[Auth] captureAnonUserIdIfPending failed:', err.message);
  }
}

// Fire the anon → authed save migration if we stashed a previous anon
// user_id before auth kicked off. Called from AuthProvider's SIGNED_IN
// handler so it runs once per auth transition regardless of which path
// (signIn, signUp, magic-link relay, deep-link) ended up here.
//
// Soft-fails on any error — never blocks the user's auth flow. If the
// migration fails, the user just has zero saves, which is the same UX
// they had before the fix shipped (so no regression risk).
export async function migrateAnonSavesIfPending() {
  let previousAnonUserId;
  try {
    previousAnonUserId = await AsyncStorage.getItem(PENDING_ANON_MIGRATION_KEY);
    if (!previousAnonUserId) return;
    // Clear before the call so a transient failure doesn't trigger
    // repeated retries on subsequent auth events.
    await AsyncStorage.removeItem(PENDING_ANON_MIGRATION_KEY);
  } catch {
    return;
  }

  try {
    // Lazy require to avoid cycle: api.js → supabase.js → auth.js.
    const { apiFetch } = require('./api');
    const result = await apiFetch('/api/account/migrate-anon', {
      method: 'POST',
      body: JSON.stringify({ previousAnonUserId }),
    });
    if (result?.migrated > 0) {
      console.log(`[Auth] Migrated ${result.migrated} anon saves to authed user`);
    }
  } catch (err) {
    console.warn('[Auth] Anon save migration failed (soft):', err.message);
  }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// signUp creates a new email/password account. The caller passes:
//   - email + password
//   - metadata: usually { role: 'tenant'|'owner' } so handle_new_user
//     trigger sets profiles.role correctly. Default 'tenant' if absent.
//   - nonce (optional): when provided, the confirmation email's link
//     redirects to /auth/mobile-callback?nonce=... which relays auth
//     tokens back to the running mobile app via Supabase Realtime.
//     This makes password signup match magic-link's smooth one-tap UX.
//     Without nonce, falls back to the static /email-confirmed page
//     (used by older callers + email-change confirmations).
export async function signUp(email, password, metadata = {}, nonce) {
  const emailRedirectTo = nonce
    ? `https://padmagnet.com/auth/mobile-callback?nonce=${nonce}`
    : 'https://padmagnet.com/email-confirmed?type=signup';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await clearUserRole();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://padmagnet.com/reset-password',
  });
  if (error) throw error;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function signInWithMagicLink(email, nonce, role) {
  // Use web intermediary page that deep-links back to the app. This works
  // reliably because the Supabase Site URL is padmagnet.com, which is on
  // the emailRedirectTo allowlist. A padmagnet:// direct scheme was tried
  // (commit 962d6ae, reverted) — Supabase's email-auth allowlist is
  // separate from the OAuth allowlist that Google/Facebook use, and the
  // custom scheme was getting silently stripped, breaking auth entirely.
  //
  // When nonce is provided, the callback page can relay tokens back to
  // the mobile app via Supabase Realtime (cross-device magic link support).
  //
  // When role is provided (from the AuthBottomSheet context), it's stored
  // as user_metadata so the handle_new_user DB trigger sets profiles.role
  // + roles correctly on first signup.
  const redirectUrl = nonce
    ? `https://padmagnet.com/auth/mobile-callback?nonce=${nonce}`
    : 'https://padmagnet.com/auth/mobile-callback';
  const options = { emailRedirectTo: redirectUrl };
  if (role) options.data = { role };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options,
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const redirectUrl = makeRedirectUri({ scheme: 'padmagnet', path: 'auth-callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type === 'success') {
    const url = new URL(result.url);
    // Handle both hash fragment and query params
    const params = url.hash
      ? new URLSearchParams(url.hash.substring(1))
      : url.searchParams;

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
      return sessionData;
    }
  }
  throw new Error('Google sign-in was cancelled');
}

export async function signInWithFacebook() {
  const redirectUrl = makeRedirectUri({ scheme: 'padmagnet', path: 'auth-callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type === 'success') {
    const url = new URL(result.url);
    const params = url.hash ? new URLSearchParams(url.hash.substring(1)) : url.searchParams;
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (sessionError) throw sessionError;
      return sessionData;
    }
  }
  throw new Error('Facebook sign-in was cancelled');
}

export async function signInWithApple() {
  const redirectUrl = makeRedirectUri({ scheme: 'padmagnet', path: 'auth-callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type === 'success') {
    const url = new URL(result.url);
    const params = url.hash ? new URLSearchParams(url.hash.substring(1)) : url.searchParams;
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (sessionError) throw sessionError;
      return sessionData;
    }
  }
  throw new Error('Apple sign-in was cancelled');
}
