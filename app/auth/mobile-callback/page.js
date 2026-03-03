'use client';

import { useEffect, useState } from 'react';

/**
 * Web intermediary for mobile magic link auth.
 *
 * Flow:
 * 1. Supabase verifies the magic link token
 * 2. Supabase redirects here with tokens in the URL hash fragment
 * 3. This page opens the mobile app via Android Intent URI or iOS scheme
 * 4. If the app doesn't open, shows a manual link
 *
 * Android Chrome blocks custom schemes from JS — must use Intent URIs.
 * Expo Go package: host.exp.exponent (Android)
 * Standalone package: com.padmagnet.app (Android)
 */
export default function MobileCallbackPage() {
  const [status, setStatus] = useState('redirecting');
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    // Supabase appends tokens as hash fragment:
    // #access_token=...&refresh_token=...&type=magiclink
    const hash = window.location.hash;
    if (!hash) {
      setStatus('error');
      return;
    }

    // Parse tokens from hash
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setStatus('error');
      return;
    }

    setTokens({ accessToken, refreshToken });

    // Build query string with tokens (Intent URIs can't use hash fragments)
    const tokenQuery = `access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isAndroid) {
      // Android: Use Intent URI — the ONLY reliable way to open apps from Chrome
      // Try Expo Go first (dev testing)
      const intentUrl = `intent://auth-callback?${tokenQuery}#Intent;scheme=exp+padmagnet;package=host.exp.exponent;end`;
      window.location.href = intentUrl;
    } else if (isIOS) {
      // iOS: Safari handles custom schemes from JS
      window.location.href = `exp+padmagnet://auth-callback?${tokenQuery}`;
    }

    // If still here after 3 seconds, show manual options
    const timer = setTimeout(() => {
      setStatus('manual');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Build the Intent/scheme URLs for manual buttons
  function getOpenUrl(target) {
    if (!tokens) return '#';
    const tokenQuery = `access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}`;
    const isAndroid = /android/i.test(navigator.userAgent);

    if (target === 'expo') {
      return isAndroid
        ? `intent://auth-callback?${tokenQuery}#Intent;scheme=exp+padmagnet;package=host.exp.exponent;end`
        : `exp+padmagnet://auth-callback?${tokenQuery}`;
    }
    // standalone
    return isAndroid
      ? `intent://auth-callback?${tokenQuery}#Intent;scheme=padmagnet;package=com.padmagnet.app;end`
      : `padmagnet://auth-callback?${tokenQuery}`;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: 24,
      fontFamily: 'system-ui, sans-serif', background: '#0f1a2e', color: '#fff',
    }}>
      {status === 'redirecting' && (
        <>
          <h2 style={{ marginBottom: 8 }}>Opening PadMagnet...</h2>
          <p style={{ color: '#8899aa' }}>Redirecting to the app</p>
        </>
      )}
      {status === 'manual' && (
        <>
          <h2 style={{ marginBottom: 8 }}>Signed in!</h2>
          <p style={{ color: '#8899aa', marginBottom: 24, textAlign: 'center' }}>
            Tap below to open the app.
          </p>
          {/* Use <a> tags — Chrome trusts href navigation more than JS onclick */}
          <a href={getOpenUrl('expo')} style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            background: '#6c5ce7', color: '#fff', borderRadius: 8,
            padding: '14px 32px', fontSize: 16, fontWeight: 600,
            marginBottom: 12, width: 260,
          }}>
            Open in Expo Go
          </a>
          <a href={getOpenUrl('standalone')} style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            background: 'transparent', color: '#8899aa', border: '1px solid #334',
            borderRadius: 8, padding: '12px 32px', fontSize: 14,
            width: 260,
          }}>
            Open PadMagnet App
          </a>
          <p style={{ color: '#556', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
            Use &quot;Expo Go&quot; during testing.
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#8899aa' }}>No authentication tokens found. Please try signing in again.</p>
        </>
      )}
    </div>
  );
}
