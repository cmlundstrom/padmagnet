'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const THEME = {
  navy: '#0B1D3A',
  surface: '#234170',
  card: '#2C5288',
  accent: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  logoOrange: '#E8603C',
  gold: '#F5C842',
  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  border: '#3464A0',
  fontHeading: "'Outfit', sans-serif",
  fontBody: "'DM Sans', sans-serif",
};

const TIER_INFO = {
  pro: {
    label: 'Pro',
    price: '$4.99',
    color: THEME.accent,
    features: [
      'Up to 5 active listings',
      'Verified owner badge',
      'Listing analytics',
      'Priority placement',
      'SMS inquiry alerts',
    ],
  },
  premium: {
    label: 'Premium',
    price: '$9.99',
    color: THEME.gold,
    features: [
      'Unlimited active listings',
      'Featured gold badge',
      'Instant push notifications',
      'Lead export',
      'Custom branding',
    ],
  },
};

function PaymentConfirmedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'complete';
  const tier = searchParams.get('tier');
  const listingId = searchParams.get('listing_id');

  const isCancelled = status === 'cancelled';
  const isError = status === 'error';
  const isSuccess = !isCancelled && !isError;
  const tierInfo = tier ? TIER_INFO[tier] : null;

  // Determine what was purchased
  const isListing = !!listingId && !tier;
  const isTier = !!tierInfo;

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
          backgroundColor: isSuccess
            ? 'rgba(34,197,94,0.15)'
            : isCancelled
              ? 'rgba(245,158,11,0.15)'
              : 'rgba(239,68,68,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '28px',
          color: isSuccess ? THEME.success : isCancelled ? THEME.warning : THEME.danger,
        }}>
          {isSuccess ? '✓' : isCancelled ? '←' : '✗'}
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
          {isSuccess && isTier && `Welcome to ${tierInfo.label}!`}
          {isSuccess && isListing && 'Listing Activated!'}
          {isSuccess && !isTier && !isListing && 'Payment Complete!'}
          {isCancelled && 'Payment Cancelled'}
          {isError && 'Payment Failed'}
        </h1>

        {/* Success — tier pass */}
        {isSuccess && isTier && (
          <>
            <p style={{
              color: THEME.success,
              fontSize: '17px',
              fontWeight: 600,
              marginBottom: '8px',
              lineHeight: '1.4',
            }}>
              Your {tierInfo.label} Pass is now active for 30 days.
            </p>

            {/* Feature summary */}
            <div style={{
              backgroundColor: `${tierInfo.color}12`,
              borderRadius: '12px',
              border: `1px solid ${tierInfo.color}30`,
              padding: '16px 20px',
              margin: '16px 0',
              textAlign: 'left',
            }}>
              <p style={{
                color: tierInfo.color,
                fontSize: '13px',
                fontWeight: 600,
                margin: '0 0 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                What&apos;s unlocked
              </p>
              {tierInfo.features.map((feat, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: i < tierInfo.features.length - 1 ? '6px' : 0,
                }}>
                  <span style={{ color: THEME.success, fontSize: '14px' }}>✓</span>
                  <span style={{ color: THEME.text, fontSize: '14px' }}>{feat}</span>
                </div>
              ))}
            </div>

            <p style={{
              color: THEME.textSecondary,
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: 0,
            }}>
              Return to the PadMagnet app to start using your new features.
              Your pass renews in 30 days.
            </p>
          </>
        )}

        {/* Success — listing activation */}
        {isSuccess && isListing && (
          <>
            <p style={{
              color: THEME.success,
              fontSize: '17px',
              fontWeight: 600,
              marginBottom: '16px',
              lineHeight: '1.4',
            }}>
              Your listing is now live and visible to tenants for 30 days.
            </p>
            <p style={{
              color: THEME.textSecondary,
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: 0,
            }}>
              Return to the PadMagnet app to manage your listing.
              You&apos;ll receive a reminder before it expires.
            </p>
          </>
        )}

        {/* Success — generic fallback */}
        {isSuccess && !isTier && !isListing && (
          <p style={{
            color: THEME.success,
            fontSize: '17px',
            fontWeight: 600,
            marginBottom: '16px',
            lineHeight: '1.4',
          }}>
            Your payment was processed successfully. Return to the PadMagnet app to continue.
          </p>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <>
            <p style={{
              color: THEME.warning,
              fontSize: '17px',
              fontWeight: 600,
              marginBottom: '16px',
              lineHeight: '1.4',
            }}>
              No charge was made. You can try again anytime from the app.
            </p>
            <p style={{
              color: THEME.textSecondary,
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: 0,
            }}>
              Return to the PadMagnet app and tap the upgrade option when you&apos;re ready.
            </p>
          </>
        )}

        {/* Error */}
        {isError && (
          <>
            <p style={{
              color: THEME.danger,
              fontSize: '17px',
              fontWeight: 600,
              marginBottom: '16px',
              lineHeight: '1.4',
            }}>
              Something went wrong processing your payment. No charge was made.
            </p>
            <p style={{
              color: THEME.textSecondary,
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '16px',
            }}>
              Please try again from the PadMagnet app. If this continues, contact us at{' '}
              <a href="mailto:support@padmagnet.com" style={{ color: THEME.accent, textDecoration: 'none' }}>
                support@padmagnet.com
              </a>
            </p>
          </>
        )}

        {/* Return to App button */}
        <a
          href="padmagnet://"
          style={{
            display: 'block',
            backgroundColor: THEME.logoOrange,
            color: THEME.text,
            fontFamily: THEME.fontBody,
            fontSize: '16px',
            fontWeight: 600,
            textAlign: 'center',
            textDecoration: 'none',
            padding: '14px 24px',
            borderRadius: '12px',
            marginTop: '24px',
            width: '100%',
          }}
        >
          Return to PadMagnet App
        </a>
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

export default function PaymentConfirmedPage() {
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
      <PaymentConfirmedContent />
    </Suspense>
  );
}
