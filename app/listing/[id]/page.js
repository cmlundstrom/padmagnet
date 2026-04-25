import { createServiceClient } from '../../../lib/supabase';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: listing } = await supabase
    .from('listings')
    .select('street_number, street_name, city, state_or_province, list_price, bedrooms_total, bathrooms_total, living_area, photos')
    .eq('id', id)
    .single();

  if (!listing) {
    return { title: 'Listing Not Found — PadMagnet' };
  }

  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const price = listing.list_price ? `$${Number(listing.list_price).toLocaleString()}/mo` : '';
  const details = [
    listing.bedrooms_total ? `${listing.bedrooms_total} bed` : '',
    listing.bathrooms_total ? `${listing.bathrooms_total} bath` : '',
    listing.living_area ? `${Number(listing.living_area).toLocaleString()} sqft` : '',
  ].filter(Boolean).join(' · ');
  const photo = listing.photos?.[0]?.url || 'https://padmagnet.com/logo/padmagnet-social-400.png';

  return {
    title: `${address}, ${listing.city} — ${price} | PadMagnet`,
    description: `${details} — Rental in ${listing.city}, ${listing.state_or_province}. View on PadMagnet.`,
    openGraph: {
      title: `${address}, ${listing.city} — ${price}`,
      description: `${details} — Rental in ${listing.city}, ${listing.state_or_province}`,
      url: `https://padmagnet.com/listing/${id}`,
      siteName: 'PadMagnet',
      type: 'website',
      images: [{ url: photo, width: 800, height: 600 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${address}, ${listing.city} — ${price}`,
      description: details,
      images: [photo],
    },
  };
}

export default async function ListingPage({ params, searchParams }) {
  const { id } = await params;
  const search = await searchParams;
  const adminPreview = search?.admin_preview === '1';
  const supabase = createServiceClient();
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !listing) {
    notFound();
  }

  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province, listing.postal_code].filter(Boolean).join(', ');
  const price = listing.list_price ? `$${Number(listing.list_price).toLocaleString()}` : '—';
  const details = [
    listing.bedrooms_total ? `${listing.bedrooms_total} bed` : '',
    listing.bathrooms_total ? `${listing.bathrooms_total} bath` : '',
    listing.living_area ? `${Number(listing.living_area).toLocaleString()} sqft` : '',
  ].filter(Boolean).join(' · ');
  const photo = listing.photos?.[0]?.url;

  return (
    <div style={styles.page}>
      {adminPreview && (
        <div style={{
          background: '#7C3AED', color: '#fff', padding: '8px 16px',
          textAlign: 'center', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          🛠 Admin Preview · status: {listing.status?.toUpperCase()} · is_active: {String(listing.is_active)}
        </div>
      )}
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <span style={styles.logoPad}>Pad</span>
          <span style={styles.logoMagnet}>Magnet</span>
        </div>

        {/* Listing card */}
        <div style={styles.card}>
          {photo ? (
            <img src={photo} alt={address} style={styles.photo} />
          ) : (
            <div style={styles.photoPlaceholder}>
              <span style={styles.placeholderEmoji}>🌴🏖️</span>
            </div>
          )}
          <div style={styles.info}>
            <div style={styles.price}>{price}<span style={styles.perMonth}>/mo</span></div>
            <div style={styles.address}>{address}</div>
            <div style={styles.city}>{cityLine}</div>
            <div style={styles.details}>{details}</div>
          </div>
        </div>

        {/* CTA */}
        <p style={styles.cta}>See full details, photos, and PadScore™ in the app.</p>

        {/* App store badges */}
        <div style={styles.badges}>
          <a href="https://apps.apple.com/app/padmagnet/id000000000" target="_blank" rel="noopener noreferrer">
            <img
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on the App Store"
              style={styles.badge}
            />
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.padmagnet.app" target="_blank" rel="noopener noreferrer">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
              alt="Get it on Google Play"
              style={styles.badge}
            />
          </a>
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          © {new Date().getFullYear()} {listing.source === 'owner' ? 'PadMagnet LLC' : 'SEFMLS'}. All rights reserved.<br />
          PadMagnet.com — Don't miss your perfect rental home match!
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#1A3358',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 16px',
    fontFamily: "'DM Sans', sans-serif",
  },
  container: {
    maxWidth: 420,
    width: '100%',
    textAlign: 'center',
  },
  logoRow: {
    marginBottom: 24,
    fontSize: 32,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
  },
  logoPad: {
    color: '#FFFFFF',
  },
  logoMagnet: {
    color: '#F95E0C',
  },
  card: {
    background: '#234170',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  photo: {
    width: '100%',
    height: 280,
    objectFit: 'cover',
    display: 'block',
  },
  photoPlaceholder: {
    width: '100%',
    height: 280,
    background: '#1a5276',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
    opacity: 0.3,
  },
  info: {
    padding: '16px 20px 20px',
    textAlign: 'left',
  },
  price: {
    fontSize: 28,
    fontWeight: 700,
    color: '#FFFFFF',
    fontFamily: "'Outfit', sans-serif",
  },
  perMonth: {
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
  },
  address: {
    fontSize: 16,
    fontWeight: 600,
    color: '#FFFFFF',
    marginTop: 4,
  },
  city: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  details: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  cta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    marginTop: 24,
    marginBottom: 20,
  },
  badges: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  badge: {
    height: 48,
  },
  footer: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 32,
    lineHeight: 1.6,
  },
};
