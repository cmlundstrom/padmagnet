'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function EmailConfirmedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'complete';
  const type = searchParams.get('type') || 'email_change';
  const message = searchParams.get('message');

  const isError = status === 'error';
  const isSignup = type === 'signup';

  const titles = {
    signup: { success: 'Account Verified!', error: 'Verification Failed' },
    email_change: { success: 'Email Updated', error: 'Confirmation Failed' },
  };

  const messages = {
    signup: {
      success: 'Your email has been confirmed and your PadMagnet account is ready.',
      error: message || 'The verification link is invalid or has expired.',
    },
    email_change: {
      success: 'Your email address has been changed successfully.',
      error: message || 'The confirmation link is invalid or has expired.',
    },
  };

  const instructions = {
    signup: {
      success: 'Go back to the PadMagnet app and sign in with your email and password to get started.',
      error: 'Please go back to the PadMagnet app and try signing up again. Verification links expire after 24 hours.',
    },
    email_change: {
      success: 'You can close this page and return to the PadMagnet app. Your new email will appear the next time you open the app.',
      error: 'Please go back to the PadMagnet app and request a new email change. Confirmation links expire after 24 hours.',
    },
  };

  const category = isSignup ? 'signup' : 'email_change';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--pm-navy)',
      padding: 'var(--pm-space-lg)',
      fontFamily: 'var(--pm-font-body)',
    }}>
      <div style={{
        backgroundColor: 'var(--pm-surface)',
        borderRadius: 'var(--pm-radius-lg)',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
      }}>
        <img
          src="/logo/padmagnet-icon-120.png"
          alt="PadMagnet"
          width={56}
          height={56}
          style={{ borderRadius: '10px', marginBottom: '16px' }}
        />
        <h1 style={{
          color: 'var(--pm-text)',
          fontFamily: 'var(--pm-font-heading)',
          fontSize: 'var(--pm-fs-2xl)',
          fontWeight: 700,
          marginBottom: '12px',
        }}>
          {isError ? titles[category].error : titles[category].success}
        </h1>
        <p style={{
          color: isError ? 'var(--pm-danger)' : 'var(--pm-success)',
          fontSize: '20px',
          fontWeight: 600,
          marginBottom: '10px',
        }}>
          {isError ? messages[category].error : messages[category].success}
        </p>
        <p style={{
          color: 'var(--pm-text-secondary)',
          fontSize: '17px',
          lineHeight: '1.5',
          marginBottom: isSignup && !isError ? '24px' : '0',
        }}>
          {isError ? instructions[category].error : instructions[category].success}
        </p>
        {isSignup && !isError && (
          <div style={{
            marginTop: '8px',
            padding: '12px 20px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <p style={{
              color: 'var(--pm-accent)',
              fontSize: '15px',
              fontWeight: 600,
              margin: 0,
            }}>
              Open the PadMagnet app and sign in with your password.
            </p>
          </div>
        )}
      </div>
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
        backgroundColor: 'var(--pm-navy)',
      }}>
        <p style={{ color: 'var(--pm-text)', fontFamily: 'var(--pm-font-body)' }}>Loading...</p>
      </div>
    }>
      <EmailConfirmedContent />
    </Suspense>
  );
}
