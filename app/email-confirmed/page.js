'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Inline design tokens — matches mobile/constants/colors.js
// Self-contained so this page renders correctly regardless of CSS loading
const THEME = {
  navy: '#0B1D3A',
  surface: '#234170',
  card: '#2C5288',
  accent: '#3B82F6',
  success: '#22C55E',
  danger: '#EF4444',
  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  border: '#3464A0',
  fontHeading: "'Outfit', sans-serif",
  fontBody: "'DM Sans', sans-serif",
};

function EmailConfirmedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'complete';
  const type = searchParams.get('type') || 'email_change';
  const message = searchParams.get('message');

  const isError = status === 'error';
  const isSignup = type === 'signup';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: THEME.navy,
      padding: '24px',
      fontFamily: THEME.fontBody,
    }}>
      {/* Google Fonts (in case layout doesn't load them) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={{
        backgroundColor: THEME.surface,
        borderRadius: '16px',
        border: `1px solid ${THEME.border}`,
        padding: '40px 32px',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <img
          src="/logo/padmagnet-icon-120-dark.png"
          alt="PadMagnet"
          width={64}
          height={64}
          style={{ borderRadius: '12px', marginBottom: '20px' }}
        />

        {/* Wordmark */}
        <div style={{
          fontFamily: THEME.fontHeading,
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '24px',
          letterSpacing: '-0.5px',
        }}>
          <span style={{ color: THEME.text }}>Pad</span>
          <span style={{ color: '#F95E0C' }}>Magnet</span>
        </div>

        {/* Status icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: isError ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '28px',
        }}>
          {isError ? '\u2717' : '\u2713'}
        </div>

        {/* Title */}
        <h1 style={{
          color: THEME.text,
          fontFamily: THEME.fontHeading,
          fontSize: '26px',
          fontWeight: 700,
          marginBottom: '12px',
          marginTop: 0,
        }}>
          {isError
            ? (isSignup ? 'Verification Failed' : 'Confirmation Failed')
            : (isSignup ? 'Account Verified!' : 'Email Updated')}
        </h1>

        {/* Status message */}
        <p style={{
          color: isError ? THEME.danger : THEME.success,
          fontSize: '17px',
          fontWeight: 600,
          marginBottom: '16px',
          lineHeight: '1.4',
        }}>
          {isError
            ? (message || 'The verification link is invalid or has expired.')
            : (isSignup
              ? 'Your email has been confirmed and your PadMagnet account is ready.'
              : 'Your email address has been changed successfully.')}
        </p>

        {/* Instructions */}
        <p style={{
          color: THEME.textSecondary,
          fontSize: '15px',
          lineHeight: '1.5',
          marginBottom: isSignup && !isError ? '20px' : '0',
        }}>
          {isError
            ? (isSignup
              ? 'Go back to the PadMagnet app and try signing up again. Verification links expire after 24 hours.'
              : 'Go back to the PadMagnet app and request a new email change. Links expire after 24 hours.')
            : (isSignup
              ? 'Open the PadMagnet app and sign in with your email and password to get started.'
              : 'You can close this page and return to the PadMagnet app. Your new email will appear next time you open it.')}
        </p>

        {/* CTA card for signup success */}
        {isSignup && !isError && (
          <div style={{
            backgroundColor: 'rgba(59,130,246,0.12)',
            borderRadius: '12px',
            border: '1px solid rgba(59,130,246,0.25)',
            padding: '16px 20px',
            marginTop: '4px',
          }}>
            <p style={{
              color: THEME.accent,
              fontSize: '15px',
              fontWeight: 600,
              margin: 0,
              lineHeight: '1.4',
            }}>
              Open the PadMagnet app and sign in with your password to continue.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p style={{
        color: THEME.textSecondary,
        fontSize: '12px',
        marginTop: '24px',
        opacity: 0.6,
        fontFamily: THEME.fontBody,
      }}>
        &copy; 2026 PadMagnet LLC. All rights reserved.
      </p>
    </div>
  );
}

export default function EmailConfirmedPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B1D3A',
      }}>
        <p style={{ color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
      </div>
    }>
      <EmailConfirmedContent />
    </Suspense>
  );
}
