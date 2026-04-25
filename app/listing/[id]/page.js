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

  // Admin Full Render — mirrors the mobile in-app Listing Detail card so an
  // admin can proof-read the entire listing without opening the app. PadScore
  // intentionally omitted (renter-facing only). Heart icon + Ask About This
  // Rental CTA also omitted (admins don't inquire on listings).
  if (adminPreview) {
    return <AdminFullRender listing={listing} />;
  }

  // Default: marketing card (the public-facing share-link landing page).
  return <MarketingCard listing={listing} />;
}

// ─────────────────────────────────────────────────────────────────────────
// Admin Full Render — proof-read mirror of the mobile detail card
// ─────────────────────────────────────────────────────────────────────────

function AdminFullRender({ listing }) {
  const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province, listing.postal_code].filter(Boolean).join(', ');
  const price = listing.list_price ? `$${Number(listing.list_price).toLocaleString()}` : '—';
  const photo = listing.photos?.[0]?.url;
  const isMls = listing.source !== 'owner';

  // Stats row — matches the in-app stats grid (4 metrics)
  const stats = [
    { label: 'Beds',       value: listing.bedrooms_total ?? '—' },
    { label: 'Baths',      value: listing.bathrooms_total ?? '—' },
    { label: 'Sqft',       value: listing.living_area ? Number(listing.living_area).toLocaleString() : '—' },
    { label: 'Year Built', value: listing.year_built || '—' },
  ];

  // Details rows — fields shown after the Stats grid in the app's "Details"
  // section. Only fields with a real value are rendered (mirrors the mobile
  // null-filter in ListingInfo.SectionBlock).
  const detailRows = [
    ['Property Type',  listing.property_sub_type || listing.property_type],
    ['Pool',           typeof listing.pool === 'boolean' ? (listing.pool ? 'Yes' : 'No') : null],
    ['Fenced Yard',    typeof listing.fenced_yard === 'boolean' ? (listing.fenced_yard ? 'Yes' : 'No') : null],
    ['Furnished',      typeof listing.furnished === 'boolean' ? (listing.furnished ? 'Yes' : 'No') : null],
    ['Pets Allowed',   listing.pets_allowed],
    ['Parking Spaces', listing.parking_spaces],
    ['Lot Size',       listing.lot_size_area != null ? `${Number(listing.lot_size_area).toLocaleString()} sqft` : null],
    ['HOA Fee',        listing.hoa_fee != null && listing.hoa_fee !== '' ? listing.hoa_fee : null],
    ['Lease Term',     listing.lease_term ? `${listing.lease_term} months` : null],
    ['Available',      listing.available_date],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  // Listed By section
  const agentName    = listing.listing_agent_name;
  const agentPhone   = listing.listing_agent_phone;
  const agentEmail   = listing.listing_agent_email;
  const listingOffice = listing.listing_office_name;

  const listedRows = [
    ['Listing Agent',  agentName],
    ['Agent Phone',    agentPhone, agentPhone ? `tel:${String(agentPhone).replace(/[^\d+]/g, '')}` : null],
    ['Agent Email',    agentEmail, agentEmail ? `mailto:${agentEmail}` : null],
    ['Listing Office', listingOffice],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  // Listed-on date
  const listedDate = listing.created_at
    ? new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={fullStyles.page}>
      {/* Admin status bar */}
      <div style={fullStyles.adminBar}>
        🛠 ADMIN PREVIEW · status: {listing.status?.toUpperCase()} · is_active: {String(listing.is_active)} · source: {listing.source?.toUpperCase()}
      </div>

      <div style={fullStyles.container}>
        {/* Header */}
        <div style={fullStyles.header}>
          <div>
            <span style={fullStyles.logoPad}>Pad</span>
            <span style={fullStyles.logoMagnet}>Magnet</span>
            <span style={fullStyles.adminBadge}>ADMIN MIRROR</span>
          </div>
          <a href="/admin#listings" style={fullStyles.backLink}>← Admin Listings</a>
        </div>

        {/* Hero photo — full width, 3:2-ish like the app card */}
        {photo ? (
          <img src={photo} alt={street} style={fullStyles.hero} />
        ) : (
          <div style={fullStyles.heroPlaceholder}>
            <span style={fullStyles.placeholderEmoji}>🌴🏖️</span>
          </div>
        )}

        {/* Price + Address — first card section */}
        <Section noTitle>
          <div style={fullStyles.price}>{price}<span style={fullStyles.perMonth}>/mo</span></div>
          <div style={fullStyles.address}>{street || '—'}</div>
          <div style={fullStyles.cityLine}>{cityLine || '—'}</div>
        </Section>

        {/* Description */}
        {listing.public_remarks && (
          <Section noTitle>
            <div style={fullStyles.description}>{listing.public_remarks}</div>
          </Section>
        )}

        {/* Stats grid (Beds / Baths / Sqft / Year Built) */}
        <div style={fullStyles.statsGrid}>
          {stats.map(s => (
            <div key={s.label} style={fullStyles.statCard}>
              <div style={fullStyles.statValue}>{s.value}</div>
              <div style={fullStyles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        {detailRows.length > 0 && (
          <Section title="Details">
            {detailRows.map(([label, value]) => (
              <FeatureRow key={label} label={label} value={value} />
            ))}
          </Section>
        )}

        {/* Contact — from the owner's contact card (renter-facing) */}
        {(listing.tenant_contact_instructions) && (
          <Section title="Contact">
            <div style={fullStyles.description}>{listing.tenant_contact_instructions}</div>
          </Section>
        )}

        {/* Listed By */}
        {listedRows.length > 0 && (
          <Section title="Listed By">
            {listedRows.map(([label, value, href]) => (
              <FeatureRow key={label} label={label} value={value} href={href} />
            ))}
          </Section>
        )}

        {/* Listed-on + MLS# meta line */}
        <div style={fullStyles.metaLine}>
          {listedDate && <>Listed {listedDate}</>}
          {listing.listing_id && <> · MLS# {listing.listing_id}</>}
          {listing.confirmation_code && <> · Confirmation: {listing.confirmation_code}</>}
        </div>

        {/* MLS disclaimer block (mirrors mobile listing footer) */}
        {isMls && (
          <div style={fullStyles.disclaimer}>
            {listing.listing_office_name && <div>Listing courtesy of {listing.listing_office_name}</div>}
            {agentName && <div>Agent: {agentName}</div>}
            <div style={{ marginTop: 8 }}>© {new Date().getFullYear()} SEFMLS. All rights reserved.</div>
            <div style={{ marginTop: 8 }}>
              The data relating to real estate for sale/lease on this web site come in part from a cooperative data exchange program of the multiple listing service (MLS) in which this real estate firm participates. Listings held by brokerage firms other than PadMagnet are marked with the listing broker's name. Information is deemed reliable but is not guaranteed.
            </div>
            <div style={fullStyles.eho}>🏠 Equal Housing Opportunity</div>
          </div>
        )}

        {/* Owner-source footer (no MLS disclaimer required) */}
        {!isMls && (
          <div style={fullStyles.disclaimer}>
            <div>This listing was posted directly by the property owner via PadMagnet.</div>
            <div style={fullStyles.eho}>🏠 Equal Housing Opportunity</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, noTitle, children }) {
  return (
    <div style={fullStyles.section}>
      {!noTitle && title && <div style={fullStyles.sectionTitle}>{title}</div>}
      {children}
    </div>
  );
}

function FeatureRow({ label, value, href }) {
  return (
    <div style={fullStyles.featureRow}>
      <span style={fullStyles.featureLabel}>{label}</span>
      <span style={fullStyles.featureValue}>
        {href ? (
          <a href={href} style={fullStyles.featureLink}>{value}</a>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

const ADMIN_BG = '#0F2B46';
const SURFACE  = '#1A3358';
const SURFACE_2 = '#234170';
const BORDER   = 'rgba(255,255,255,0.08)';
const TEXT     = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.65)';
const TEXT_MUTED = 'rgba(255,255,255,0.45)';
const ACCENT   = '#4A90D9';

const fullStyles = {
  page: {
    minHeight: '100vh',
    background: ADMIN_BG,
    fontFamily: "'DM Sans', sans-serif",
    color: TEXT,
  },
  adminBar: {
    background: '#7C3AED',
    color: '#fff',
    padding: '8px 16px',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '16px 16px 80px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 4px 16px',
  },
  logoPad: { color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700 },
  logoMagnet: { color: '#F95E0C', fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700 },
  adminBadge: {
    marginLeft: 10,
    padding: '2px 8px',
    background: '#7C3AED33',
    color: '#A78BFA',
    border: '1px solid #7C3AED55',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    verticalAlign: 'middle',
  },
  backLink: {
    color: ACCENT,
    fontSize: 13,
    textDecoration: 'none',
  },

  hero: {
    width: '100%',
    aspectRatio: '3 / 2',
    objectFit: 'cover',
    borderRadius: 12,
    display: 'block',
    background: SURFACE_2,
  },
  heroPlaceholder: {
    width: '100%',
    aspectRatio: '3 / 2',
    background: SURFACE_2,
    borderRadius: 12,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: { fontSize: 64, opacity: 0.3 },

  section: {
    marginTop: 16,
    padding: '14px 16px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },

  price: {
    fontSize: 32,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1.1,
  },
  perMonth: {
    fontSize: 16,
    fontWeight: 400,
    color: TEXT_DIM,
    marginLeft: 4,
  },
  address: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 8,
  },
  cityLine: {
    fontSize: 14,
    color: TEXT_DIM,
    marginTop: 2,
  },

  description: {
    fontSize: 14,
    lineHeight: 1.6,
    color: TEXT_DIM,
    whiteSpace: 'pre-wrap',
  },

  statsGrid: {
    marginTop: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  statCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '12px 8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    color: TEXT,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  featureRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '10px 0',
    borderTop: `1px solid ${BORDER}`,
    gap: 12,
  },
  featureLabel: {
    fontSize: 13,
    color: TEXT_DIM,
    flexShrink: 0,
  },
  featureValue: {
    fontSize: 14,
    fontWeight: 600,
    color: TEXT,
    textAlign: 'right',
    wordBreak: 'break-word',
    minWidth: 0,
  },
  featureLink: {
    color: ACCENT,
    textDecoration: 'underline',
    textDecorationColor: 'rgba(74,144,217,0.5)',
    textUnderlineOffset: 3,
  },

  metaLine: {
    marginTop: 16,
    fontSize: 12,
    color: TEXT_MUTED,
    paddingLeft: 4,
  },

  disclaimer: {
    marginTop: 20,
    padding: '14px 16px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 1.55,
  },
  eho: {
    marginTop: 10,
    fontSize: 12,
    color: TEXT_DIM,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Marketing card — original public landing page (share-link target).
// Unchanged behavior; just extracted into a sibling component so the
// admin-preview render path is cleanly separate.
// ─────────────────────────────────────────────────────────────────────────

function MarketingCard({ listing }) {
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
    <div style={mktStyles.page}>
      <div style={mktStyles.container}>
        {/* Logo */}
        <div style={mktStyles.logoRow}>
          <span style={mktStyles.logoPad}>Pad</span>
          <span style={mktStyles.logoMagnet}>Magnet</span>
        </div>

        {/* Listing card */}
        <div style={mktStyles.card}>
          {photo ? (
            <img src={photo} alt={address} style={mktStyles.photo} />
          ) : (
            <div style={mktStyles.photoPlaceholder}>
              <span style={mktStyles.placeholderEmoji}>🌴🏖️</span>
            </div>
          )}
          <div style={mktStyles.info}>
            <div style={mktStyles.price}>{price}<span style={mktStyles.perMonth}>/mo</span></div>
            <div style={mktStyles.address}>{address}</div>
            <div style={mktStyles.city}>{cityLine}</div>
            <div style={mktStyles.details}>{details}</div>
          </div>
        </div>

        {/* CTA */}
        <p style={mktStyles.cta}>See full details, photos, and PadScore™ in the app.</p>

        {/* App store badges */}
        <div style={mktStyles.badges}>
          <a href="https://apps.apple.com/app/padmagnet/id000000000" target="_blank" rel="noopener noreferrer">
            <img
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on the App Store"
              style={mktStyles.badge}
            />
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.padmagnet.app" target="_blank" rel="noopener noreferrer">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
              alt="Get it on Google Play"
              style={mktStyles.badge}
            />
          </a>
        </div>

        {/* Footer */}
        <p style={mktStyles.footer}>
          © {new Date().getFullYear()} {listing.source === 'owner' ? 'PadMagnet LLC' : 'SEFMLS'}. All rights reserved.<br />
          PadMagnet.com — Don't miss your perfect rental home match!
        </p>
      </div>
    </div>
  );
}

const mktStyles = {
  page: {
    minHeight: '100vh',
    background: '#1A3358',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 16px',
    fontFamily: "'DM Sans', sans-serif",
  },
  container: { maxWidth: 420, width: '100%', textAlign: 'center' },
  logoRow: { marginBottom: 24, fontSize: 32, fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
  logoPad: { color: '#FFFFFF' },
  logoMagnet: { color: '#F95E0C' },
  card: { background: '#234170', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' },
  photo: { width: '100%', height: 280, objectFit: 'cover', display: 'block' },
  photoPlaceholder: { width: '100%', height: 280, background: '#1a5276', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 64, opacity: 0.3 },
  info: { padding: '16px 20px 20px', textAlign: 'left' },
  price: { fontSize: 28, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Outfit', sans-serif" },
  perMonth: { fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.6)' },
  address: { fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginTop: 4 },
  city: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  details: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  cta: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 24, marginBottom: 20 },
  badges: { display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  badge: { height: 48 },
  footer: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 32, lineHeight: 1.6 },
};
