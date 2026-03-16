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

export async function signInWithMagicLink(email) {
  // Use web intermediary page that deep-links back to the app.
  // This works in both Expo Go and standalone builds, unlike padmagnet:// direct.
  const redirectUrl = 'https://padmagnet.com/auth/mobile-callback';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl },
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

// updateUserRole removed — profiles.role is the single source of truth (Step 2 role fix)
