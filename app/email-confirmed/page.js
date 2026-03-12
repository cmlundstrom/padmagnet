'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function EmailConfirmedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'complete';
  const message = searchParams.get('message');

  const content = {
    complete: {
      heading: 'Email Updated',
      body: 'Your email address has been changed successfully.',
      detail: 'You can close this page and return to the PadMagnet app. Your new email will appear the next time you open the app.',
      color: 'var(--pm-success)',
    },
    partial: {
      heading: 'One More Step',
      body: 'First confirmation received.',
      detail: 'Please check your other email address and click the confirmation link there to complete the change.',
      color: 'var(--pm-warning)',
    },
    error: {
      heading: 'Confirmation Failed',
      body: message || 'The confirmation link is invalid or has expired.',
      detail: 'Please go back to the PadMagnet app and request a new email change. Confirmation links expire after 24 hours.',
      color: 'var(--pm-danger)',
    },
  };

  const c = content[status] || content.complete;

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
          {c.heading}
        </h1>
        <p style={{
          color: c.color,
          fontSize: '20px',
          fontWeight: 600,
          marginBottom: '10px',
        }}>
          {c.body}
        </p>
        <p style={{
          color: 'var(--pm-text-secondary)',
          fontSize: '17px',
        }}>
          {c.detail}
        </p>
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
