'use client';

import { useEffect, useState } from 'react';

/**
 * Web intermediary for mobile magic link auth.
 *
 * Flow:
 * 1. Supabase verifies the magic link token
 * 2. Supabase redirects here with tokens in the URL hash fragment
 * 3. This page attempts to open the mobile app via deep link
 * 4. If the app doesn't open, shows a manual "Open App" button
 */
export default function MobileCallbackPage() {
  const [status, setStatus] = useState('redirecting');

  useEffect(() => {
    // Supabase appends tokens as hash fragment:
    // #access_token=...&refresh_token=...&type=magiclink
    const hash = window.location.hash;
    if (!hash) {
      setStatus('error');
      return;
    }

    // Build the deep link URL for the mobile app
    const appUrl = `padmagnet://auth-callback${hash}`;

    // Try to open the app
    window.location.href = appUrl;

    // If we're still here after 2 seconds, the app didn't open
    const timer = setTimeout(() => {
      setStatus('manual');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenApp = () => {
    const hash = window.location.hash;
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
            If the app didn&apos;t open automatically, tap the button below.
          </p>
          <button onClick={handleOpenApp} style={{
            background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: 8,
            padding: '14px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
          }}>
            Open PadMagnet
          </button>
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
