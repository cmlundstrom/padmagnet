'use client';

import { useEffect, useState } from 'react';

/**
 * Web intermediary for mobile magic link auth.
 *
 * Flow:
 * 1. Supabase verifies the magic link token
 * 2. Supabase redirects here with tokens in the URL hash fragment
 * 3. This page attempts to open the mobile app via deep link
 * 4. If the app doesn't open, shows manual "Open App" buttons
 *
 * Deep link schemes:
 * - Expo Go (dev): exp+padmagnet://auth-callback
 * - Standalone (prod): padmagnet://auth-callback
 */
export default function MobileCallbackPage() {
  const [status, setStatus] = useState('redirecting');
  const [hash, setHash] = useState('');

  useEffect(() => {
    // Supabase appends tokens as hash fragment:
    // #access_token=...&refresh_token=...&type=magiclink
    const h = window.location.hash;
    if (!h) {
      setStatus('error');
      return;
    }
    setHash(h);

    // Try Expo Go scheme first (dev), then standalone scheme (prod).
    // On a device with the standalone app installed, padmagnet:// will work.
    // On a device running Expo Go, exp+padmagnet:// will work.
    // We try both with a short delay between them.
    const expoUrl = `exp+padmagnet://auth-callback${h}`;
    const standaloneUrl = `padmagnet://auth-callback${h}`;

    // Try Expo Go scheme first (most likely during development)
    window.location.href = expoUrl;

    // After a short delay, try standalone scheme as fallback
    const fallbackTimer = setTimeout(() => {
      window.location.href = standaloneUrl;
    }, 1000);

    // If we're still here after 3 seconds, neither worked
    const manualTimer = setTimeout(() => {
      setStatus('manual');
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(manualTimer);
    };
  }, []);

  const handleOpenExpo = () => {
    window.location.href = `exp+padmagnet://auth-callback${hash}`;
  };

  const handleOpenStandalone = () => {
    window.location.href = `padmagnet://auth-callback${hash}`;
  };

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
            If the app didn&apos;t open automatically, tap a button below.
          </p>
          <button onClick={handleOpenExpo} style={{
            background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: 8,
            padding: '14px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            marginBottom: 12, width: 260,
          }}>
            Open in Expo Go
          </button>
          <button onClick={handleOpenStandalone} style={{
            background: 'transparent', color: '#8899aa', border: '1px solid #334',
            borderRadius: 8, padding: '12px 32px', fontSize: 14, cursor: 'pointer',
            width: 260,
          }}>
            Open PadMagnet App
          </button>
          <p style={{ color: '#556', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
            Use &quot;Expo Go&quot; during testing, or &quot;PadMagnet App&quot; for the standalone app.
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
