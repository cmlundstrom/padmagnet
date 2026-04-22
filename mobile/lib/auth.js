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
