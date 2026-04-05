'use client';

import { useEffect, useState } from 'react';

/**
 * Web intermediary for mobile magic link auth.
 *
 * Flow:
 * 1. Supabase verifies the magic link token
 * 2. Supabase redirects here with tokens in the URL hash fragment
 * 3. On mobile: opens the app via Android Intent URI or iOS scheme
 * 4. On desktop: relays tokens to the mobile app via /auth/relay-tokens API
 *    (the mobile app listens via Supabase Realtime subscription)
 * 5. If the app doesn't open on mobile, shows manual buttons
 */
export default function MobileCallbackPage() {
  const [status, setStatus] = useState('redirecting');
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setStatus('error');
      return;
    }

    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setStatus('error');
      return;
    }

    setTokens({ accessToken, refreshToken });

    // Read nonce from query string (passed through Supabase redirect)
    const queryParams = new URLSearchParams(window.location.search);
    const nonce = queryParams.get('nonce');

    const tokenQuery = `access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isMobile = isAndroid || isIOS;

    if (!isMobile) {
      // Desktop — relay tokens to the mobile app via API
      if (nonce) {
        setStatus('desktop-relaying');
        fetch('/auth/relay-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nonce,
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            setStatus(data.ok ? 'desktop-relayed' : 'desktop');
          })
          .catch(() => setStatus('desktop'));
      } else {
        // No nonce — older magic link or direct visit
        setStatus('desktop');
      }
      return;
    }

    // Mobile — deep-link into the app
    if (isAndroid) {
      const standaloneIntent = `intent://auth-callback?${tokenQuery}#Intent;scheme=padmagnet;package=com.padmagnet.app;end`;
      window.location.href = standaloneIntent;

      setTimeout(() => {
        const expoIntent = `intent://auth-callback?${tokenQuery}#Intent;scheme=exp+padmagnet;package=host.exp.exponent;end`;
        window.location.href = expoIntent;
      }, 1500);
    } else if (isIOS) {
      window.location.href = `padmagnet://auth-callback?${tokenQuery}`;
    }

    // If still here after 4 seconds, show manual options
    const timer = setTimeout(() => {
      setStatus('manual');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  function getOpenUrl(target) {
    if (!tokens) return '#';
    const tokenQuery = `access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}`;
    const isAndroid = /android/i.test(navigator.userAgent);

    if (target === 'expo') {
      return isAndroid
        ? `intent://auth-callback?${tokenQuery}#Intent;scheme=exp+padmagnet;package=host.exp.exponent;end`
        : `exp+padmagnet://auth-callback?${tokenQuery}`;
    }
    return isAndroid
      ? `intent://auth-callback?${tokenQuery}#Intent;scheme=padmagnet;package=com.padmagnet.app;end`
      : `padmagnet://auth-callback?${tokenQuery}`;
  }

  const infoBox = {
    background: '#1A3358', border: '1px solid #3464A0', borderRadius: 12,
    padding: '20px 28px', textAlign: 'center', maxWidth: 340,
  };

  const copyright = { color: '#556', fontSize: 11, marginTop: 20, textAlign: 'center' };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0B1D3A', color: '#fff',
    }}>
      <div style={{ marginBottom: 24 }}>
        <img
          src="/logo/PM_LOGO_180px180p.png"
          alt="PadMagnet"
          width={64}
          height={64}
          style={{ borderRadius: 16, display: 'block', margin: '0 auto' }}
        />
      </div>

      {status === 'redirecting' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Opening PadMagnet...</h2>
          <p style={{ color: '#8899aa', fontSize: 14 }}>Redirecting to the app</p>
        </>
      )}

      {status === 'desktop-relaying' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Signing you in...</h2>
          <p style={{ color: '#8899aa', fontSize: 14 }}>Sending your session to the PadMagnet app</p>
        </>
      )}

      {status === 'desktop-relayed' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>You're signed in!</h2>
          <p style={{ color: '#8899aa', fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: '22px', marginBottom: 24 }}>
            Your session has been sent to the PadMagnet app. Check your phone — it should sign in automatically.
          </p>
          <div style={infoBox}>
            <p style={{ color: '#B0BEC5', fontSize: 13, margin: 0 }}>
              If the app doesn't update within a few seconds, open it and tap <strong>Magic Link</strong> again.
            </p>
          </div>
          <p style={copyright}>© {new Date().getFullYear()} PadMagnet LLC</p>
        </>
      )}

      {status === 'desktop' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Open this link on your phone</h2>
          <p style={{ color: '#8899aa', fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: '22px', marginBottom: 24 }}>
            This sign-in link works best when opened on the device where PadMagnet is installed.
          </p>
          <div style={infoBox}>
            <p style={{ color: '#B0BEC5', fontSize: 13, margin: 0 }}>
              Open your email app on your phone and tap the link there instead.
            </p>
          </div>
          <p style={copyright}>© {new Date().getFullYear()} PadMagnet LLC</p>
        </>
      )}

      {status === 'manual' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Signed in!</h2>
          <p style={{ color: '#8899aa', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
            Tap below to open the app.
          </p>
          <a href={getOpenUrl('standalone')} style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            background: '#E8603C', color: '#fff', borderRadius: 12,
            padding: '14px 32px', fontSize: 16, fontWeight: 600,
            marginBottom: 12, width: 260,
          }}>
            Open PadMagnet
          </a>
          <a href={getOpenUrl('expo')} style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            background: 'transparent', color: '#8899aa', border: '1px solid #3464A0',
            borderRadius: 12, padding: '12px 32px', fontSize: 14,
            width: 260,
          }}>
            Open in Expo Go (dev)
          </a>
          <p style={copyright}>© {new Date().getFullYear()} PadMagnet LLC</p>
        </>
      )}

      {status === 'error' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Link Expired</h2>
          <p style={{ color: '#8899aa', fontSize: 14, textAlign: 'center', maxWidth: 340, lineHeight: '22px', marginBottom: 24 }}>
            This magic link has already been used or has expired. Each link can only be used once.
          </p>
          <div style={infoBox}>
            <p style={{ color: '#B0BEC5', fontSize: 13, margin: 0 }}>
              Open the PadMagnet app and request a new magic link to sign in.
            </p>
          </div>
          <p style={copyright}>© {new Date().getFullYear()} PadMagnet LLC</p>
        </>
      )}
    </div>
  );
}
