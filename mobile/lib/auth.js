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
    options: { data: metadata },
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
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function signInWithMagicLink(email) {
  const redirectUrl = makeRedirectUri({ scheme: 'padmagnet', path: 'auth-callback' });
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

export async function updateUserRole(role) {
  const { error } = await supabase.auth.updateUser({
    data: { role },
  });
  if (error) throw error;
}
