import { supabase } from './supabase';
import { clearUserRole } from './storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: 'https://padmagnet.com/email-confirmed?type=signup',
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
  // Direct deep link — tapping the magic link opens the app straight to
  // auth-callback.js, which processes the tokens in-process. Replaces the
  // previous `https://padmagnet.com/auth/mobile-callback` web intermediary
  // (3-10s lag from the browser round-trip). Same scheme the OAuth flows
  // below already use via makeRedirectUri, so padmagnet:// is already on
  // the Supabase allowed-redirect list.
  //
  // Trade-off: breaks cross-device flow (tapping the email link on desktop
  // now does nothing). Cross-device was previously handled by the web page
  // broadcasting tokens to the mobile app via Supabase Realtime using the
  // nonce. The relay subscription in AuthBottomSheet still runs but won't
  // fire until/unless we reintroduce a web fallback. This is a mobile-first
  // app — the same-device speedup is worth it.
  //
  // When role is provided (from the AuthBottomSheet context — e.g. 'owner'
  // for create_listing / owner_profile / owner_messages), it's stored as
  // user_metadata so the handle_new_user DB trigger sets profiles.role +
  // roles correctly on first signup.
  const redirectUrl = makeRedirectUri({ scheme: 'padmagnet', path: 'auth-callback' });
  const options = { emailRedirectTo: redirectUrl };
  if (role) options.data = { role };
  // nonce currently unused — kept in the signature so subscribeMagicLinkRelay
  // callers don't break. If we restore a cross-device fallback later, it
  // can reuse this param.
  void nonce;
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
