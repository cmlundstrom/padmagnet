'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '../../lib/supabase-browser';
import styles from './renew.module.css';

export default function RenewPage() {
  return (
    <Suspense fallback={<div className={`app-theme ${styles.container}`}><div className={styles.card}><p className={styles.message}>Loading...</p></div></div>}>
      <RenewContent />
    </Suspense>
  );
}

function RenewContent() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listing_id');
  const [status, setStatus] = useState('loading'); // loading, ready, processing, success, error
  const [listing, setListing] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redirect to sign-in with return URL
        window.location.href = `/auth/signin?redirect=/renew?listing_id=${listingId}&action=renew`;
        return;
      }
      setUser(session.user);

      if (!listingId) {
        setError('No listing specified');
        setStatus('error');
        return;
      }

      // Fetch listing info
      try {
        const res = await fetch(`/api/listings/${listingId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setListing(data);
          setStatus('ready');
        } else {
          setError('Listing not found');
          setStatus('error');
        }
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    }
    init();
  }, [listingId]);

  const handleRenew = async () => {
    setStatus('processing');
    try {
      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/stripe/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ listing_id: listingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // No saved payment method — redirect to checkout
        if (res.status === 400 || res.status === 402) {
          const checkoutRes = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              listing_id: listingId,
              product_ids: [], // Will use default listing product
            }),
          });
          const checkout = await checkoutRes.json();
          if (checkout.checkout_url) {
            window.location.href = checkout.checkout_url;
            return;
          }
        }
        throw new Error(data.error || 'Renewal failed');
      }

      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const address = listing
    ? [listing.street_number, listing.street_name, listing.city].filter(Boolean).join(' ')
    : '';

  return (
    <div className={`app-theme ${styles.container}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Renew Your Listing</h1>

        {status === 'loading' && (
          <p className={styles.message}>Loading...</p>
        )}

        {status === 'ready' && listing && (
          <>
            <div className={styles.listingInfo}>
              <p className={styles.address}>{address}</p>
              <p className={styles.price}>${listing.list_price}/mo</p>
            </div>
            <p className={styles.description}>
              Renew for another 30 days. Your listing will be immediately active
              and visible to tenants.
            </p>
            <button className={styles.renewBtn} onClick={handleRenew}>
              Renew Now — $29.99
            </button>
          </>
        )}

        {status === 'processing' && (
          <p className={styles.message}>Processing payment...</p>
        )}

        {status === 'success' && (
          <div className={styles.successBox}>
            <h2>Listing Renewed!</h2>
            <p>Your listing is now active for another 30 days.</p>
            <a href="/dashboard/listings" className={styles.link}>
              Go to Dashboard
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorBox}>
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={() => setStatus('ready')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
