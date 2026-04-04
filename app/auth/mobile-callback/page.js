'use client';

import { useEffect, useState } from 'react';

/**
 * Web intermediary for mobile magic link auth.
 *
 * Flow:
 * 1. Supabase verifies the magic link token
 * 2. Supabase redirects here with tokens in the URL hash fragment
 * 3. This page opens the mobile app via Android Intent URI or iOS scheme
 * 4. Desktop users see a branded confirmation page
 * 5. If the app doesn't open on mobile, shows manual buttons
 */
export default function MobileCallbackPage() {
  const [status, setStatus] = useState('redirecting');
  const [tokens, setTokens] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setStatus('error');
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setStatus('error');
      return;
    }

    setTokens({ accessToken, refreshToken });

    const tokenQuery = `access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isMobile = isAndroid || isIOS;

    if (!isMobile) {
      // Desktop — show branded confirmation
      setIsDesktop(true);
      setStatus('desktop');
      return;
    }

    if (isAndroid) {
      // Try standalone app first, then Expo Go
      const standaloneIntent = `intent://auth-callback?${tokenQuery}#Intent;scheme=padmagnet;package=com.padmagnet.app;end`;
      window.location.href = standaloneIntent;
    } else if (isIOS) {
      window.location.href = `padmagnet://auth-callback?${tokenQuery}`;
    }

    // If still here after 3 seconds, show manual options
    const timer = setTimeout(() => {
      setStatus('manual');
    }, 3000);

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

      {status === 'desktop' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>You're signed in!</h2>
          <p style={{ color: '#8899aa', fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: '22px', marginBottom: 24 }}>
            Your email has been verified. Open the PadMagnet app on your phone to continue.
          </p>
          <div style={{
            background: '#1A3358', border: '1px solid #3464A0', borderRadius: 12,
            padding: '20px 28px', textAlign: 'center', maxWidth: 340,
          }}>
            <p style={{ color: '#B0BEC5', fontSize: 13, margin: 0 }}>
              Already have the app? Open it and you'll be automatically signed in.
            </p>
          </div>
          <p style={{ color: '#556', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
            © {new Date().getFullYear()} PadMagnet LLC
          </p>
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
          <p style={{ color: '#556', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
            © {new Date().getFullYear()} PadMagnet LLC
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Link Expired</h2>
          <p style={{ color: '#8899aa', fontSize: 14, textAlign: 'center', maxWidth: 340, lineHeight: '22px', marginBottom: 24 }}>
            This magic link has already been used or has expired. Each link can only be used once.
          </p>
          <div style={{
            background: '#1A3358', border: '1px solid #3464A0', borderRadius: 12,
            padding: '20px 28px', textAlign: 'center', maxWidth: 340,
          }}>
            <p style={{ color: '#B0BEC5', fontSize: 13, margin: 0 }}>
              Open the PadMagnet app and request a new magic link to sign in.
            </p>
          </div>
          <p style={{ color: '#556', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
            © {new Date().getFullYear()} PadMagnet LLC
          </p>
        </>
      )}
    </div>
  );
}
