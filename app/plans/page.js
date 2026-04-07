'use client';

import { useEffect, useState } from 'react';

/**
 * /plans — fallback web page for email CTA links.
 * On mobile: deep-links into the app's upgrade screen.
 * On desktop: shows a branded page directing user to open on their phone.
 */
export default function PlansPage() {
  const [status, setStatus] = useState('redirecting');

  useEffect(() => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isMobile = isAndroid || isIOS;

    if (isMobile) {
      // Try deep-link into the app
      if (isAndroid) {
        window.location.href = 'intent://owner/upgrade#Intent;scheme=padmagnet;package=com.padmagnet.app;end';
      } else {
        window.location.href = 'padmagnet://owner/upgrade';
      }

      // If still here after 2 seconds, show manual link
      setTimeout(() => setStatus('manual'), 2000);
    } else {
      setStatus('desktop');
    }
  }, []);

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
          <p style={{ color: '#8899aa', fontSize: 14 }}>Redirecting to upgrade plans</p>
        </>
      )}

      {status === 'desktop' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Upgrade Your Listing Plan</h2>
          <p style={{ color: '#8899aa', fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: '22px', marginBottom: 24 }}>
            Listing plan upgrades are available in the PadMagnet app. Open this email on your phone to view upgrade options.
          </p>
          <div style={{
            background: '#1A3358', border: '1px solid #3464A0', borderRadius: 12,
            padding: '20px 28px', textAlign: 'center', maxWidth: 340,
          }}>
            <p style={{ color: '#B0BEC5', fontSize: 13, margin: 0 }}>
              Open the PadMagnet app on your phone, go to <strong>Listings</strong>, and tap <strong>Choose Your Plan</strong>.
            </p>
          </div>
          <p style={{ color: '#556', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
            © {new Date().getFullYear()} PadMagnet LLC
          </p>
        </>
      )}

      {status === 'manual' && (
        <>
          <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Upgrade Your Plan</h2>
          <p style={{ color: '#8899aa', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
            Tap below to open the app.
          </p>
          <a href="padmagnet://owner/upgrade" style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            background: '#E8603C', color: '#fff', borderRadius: 12,
            padding: '14px 32px', fontSize: 16, fontWeight: 600,
            marginBottom: 12, width: 260,
          }}>
            Open PadMagnet
          </a>
          <p style={{ color: '#556', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
            © {new Date().getFullYear()} PadMagnet LLC
          </p>
        </>
      )}
    </div>
  );
}
