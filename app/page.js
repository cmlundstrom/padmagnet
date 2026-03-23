'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================================
// PADMAGNET LANDING PAGE — Exact conversion from index.html
// Supabase waitlist connection preserved.
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function submitToWaitlist(email, role) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 409 || errData.code === '23505') {
      return { duplicate: true };
    }
    throw new Error('Signup failed');
  }
  return { success: true };
}

function WaitlistForm({ formId, defaultRole = 'tenant', showRoleSelector = false, theme = 'dark' }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [state, setState] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setState('loading');
    try {
      const result = await submitToWaitlist(email, role);
      if (result.duplicate) {
        setState('duplicate');
      } else {
        setState('success');
        setEmail('');
      }
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 4000);
  };

  const buttonText = {
    idle: 'Join Waitlist',
    loading: 'Joining...',
    success: "✓ You're in!",
    duplicate: '✓ Already signed up',
    error: 'Try Again',
  };

  return (
    <div>
      {showRoleSelector && (
        <div className={`cta-role-select ${theme === 'light' ? 'role-select-light' : ''}`}>
          <button type="button" className={`role-btn ${theme === 'light' ? 'role-btn-light' : ''} ${role === 'tenant' ? 'active' : ''}`} onClick={() => setRole('tenant')}>
            🏠 I&apos;m a Tenant
          </button>
          <button type="button" className={`role-btn ${theme === 'light' ? 'role-btn-light' : ''} ${role === 'owner' ? 'active' : ''}`} onClick={() => setRole('owner')}>
            🔑 I&apos;m a Property Owner
          </button>
        </div>
      )}
      <form className={formId === 'cta' ? 'cta-form' : 'hero-form'} onSubmit={handleSubmit}>
        <input type="email" placeholder="Enter your email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={state === 'loading'} className={state === 'success' || state === 'duplicate' ? 'submitted' : ''}>
          {buttonText[state]}
        </button>
      </form>
    </div>
  );
}

function PhoneMockup() {
  const [positions, setPositions] = useState([0, 1, 2]);
  const [swiping, setSwiping] = useState(-1);

  useEffect(() => {
    const interval = setInterval(() => {
      setSwiping(positions[0]);
      setTimeout(() => {
        setPositions(prev => {
          const next = [...prev];
          next.push(next.shift());
          return next;
        });
        setSwiping(-1);
      }, 500);
    }, 3500);
    return () => clearInterval(interval);
  }, [positions]);

  const cards = [
    { img: '/images/card1.jpg', alt: 'Luxury apartment with pool', score: 92, price: '$2,450', street: 'Palm Beach Gardens', city: 'FL', beds: 2, baths: 2, sqft: '1,180' },
    { img: '/images/card2.jpg', alt: 'Mediterranean style home', score: 84, price: '$3,100', street: 'Jupiter', city: 'FL', beds: 4, baths: 3, sqft: '2,240' },
    { img: '/images/card3.png', alt: 'Single family home with garage', score: 76, price: '$2,800', street: 'Downtown Stuart', city: 'FL', beds: 3, baths: 2, sqft: '1,820' },
  ];

  return (
    <div className="hero-visual">
      <div className="phone-frame">
        <div className="phone-screen">
          {/* Header */}
          <div className="pm-header">
            <div className="pm-header-left">
              <div className="pm-refresh">↻</div>
              <span className="pm-logo"><span className="pm-pad">Pad</span><span className="pm-magnet">Magnet</span></span>
            </div>
            <div className="pm-toggle">
              <span className="pm-toggle-btn active">▣</span>
              <span className="pm-toggle-btn">◎</span>
              <span className="pm-toggle-btn">☰</span>
            </div>
          </div>

          {/* Intro text */}
          <div className="pm-intro">
            Hi Sara, your <strong>PadScore™</strong> is now live! Swipe right to discover your perfect rental home.
          </div>

          {/* Swipe stack */}
          <div className="swipe-stack">
            {cards.map((card, i) => {
              const pos = positions.indexOf(i);
              return (
                <div key={i} className={`swipe-card ${swiping === i ? 'swiping' : ''}`} data-pos={pos}>
                  <div className="swipe-card-photo">
                    <img src={card.img} alt={card.alt} loading="eager" />
                    <div className="swipe-card-score">{card.score}%</div>
                  </div>
                  <div className="swipe-card-info">
                    <div className="swipe-card-price">{card.price}<span className="swipe-card-mo">/mo</span></div>
                    <div className="swipe-card-street">{card.street}, {card.city}</div>
                    <div className="swipe-card-stats">{card.beds} bed · {card.baths} bath · {card.sqft} sqft</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="pm-actions">
            <div className="pm-btn pm-btn-skip">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                <path d="M3 6h18v2H3V6zm2 3h14l-1.2 13.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 9zm4 2v9h2v-9H9zm4 0v9h2v-9h-2z" />
                <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V4z" />
              </svg>
            </div>
            <div className="pm-btn pm-btn-info">
              <svg width="12" height="12" viewBox="0 0 10 24" fill="#fff">
                <circle cx="5" cy="4" r="2" />
                <rect x="3" y="9" width="4" height="12" rx="1" />
              </svg>
            </div>
            <div className="pm-btn pm-btn-save">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="mockupHeartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="45%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                  <linearGradient id="mockupHeartShine" x1="0.3" y1="0" x2="0.7" y2="0.5">
                    <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#mockupHeartGrad)" />
                <path d="M7.5 4.5c-1.93 0-3.5 1.57-3.5 3.5 0 .97.4 1.84 1.03 2.5C6.5 8.5 8 6.5 10.5 5.5 9.6 4.85 8.6 4.5 7.5 4.5z" fill="url(#mockupHeartShine)" />
              </svg>
            </div>
          </div>

          {/* MLS footer */}
          <div className="pm-mls">© 2026 SEFMLS. All rights reserved.</div>

          {/* Tab bar — matches NativeTabs */}
          <div className="pm-tabs">
            <div className="pm-tab active"><span className="pm-tab-icon">⌂</span><span>Swipe</span></div>
            <div className="pm-tab"><span className="pm-tab-icon">♡</span><span>Saved</span></div>
            <div className="pm-tab"><span className="pm-tab-icon">✉</span><span>Messages</span></div>
            <div className="pm-tab"><span className="pm-tab-icon">👤</span><span>Profile</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified county boundary polygons for SE Florida service area
const COUNTY_BOUNDARIES = {
  'St. Lucie': [
    [27.573, -80.870], [27.573, -80.226], [27.573, -80.030],
    [27.345, -80.030], [27.345, -80.226], [27.345, -80.870],
  ],
  'Martin': [
    [27.345, -80.670], [27.345, -80.226], [27.345, -80.030],
    [26.969, -80.030], [26.969, -80.226], [26.969, -80.670],
  ],
  'Palm Beach': [
    [26.969, -80.880], [26.969, -80.445], [26.969, -80.030],
    [26.320, -80.030], [26.320, -80.445], [26.320, -80.880],
  ],
  'Broward': [
    [26.320, -80.880], [26.320, -80.445], [26.320, -80.070],
    [25.957, -80.070], [25.957, -80.445], [25.957, -80.880],
  ],
  'Miami-Dade': [
    [25.957, -80.880], [25.957, -80.445], [25.957, -80.070],
    [25.636, -80.070], [25.636, -80.250], [25.240, -80.250],
    [25.240, -80.445], [25.240, -80.880],
  ],
};

function LocationMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      if (!mapRef.current || mapInstance.current) return;
      const L = window.L;

      const map = L.map(mapRef.current, {
        center: [27.0, -81.2],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        touchZoom: true,
      });

      // Voyager tiles — clean, minimal land with blue water
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 14,
        minZoom: 7,
      }).addTo(map);

      // Draw county boundary polygons with PadMagnet orange fill
      Object.entries(COUNTY_BOUNDARIES).forEach(([name, coords]) => {
        const polygon = L.polygon(coords, {
          color: '#E8603C',
          weight: 1.5,
          opacity: 0.7,
          fillColor: '#E8603C',
          fillOpacity: 0.15,
        }).addTo(map);

        polygon.bindTooltip(name + ' County', {
          permanent: false,
          direction: 'center',
          className: 'county-tooltip',
        });
      });

      mapInstance.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="leaflet-map" />;
}

function FadeUp({ children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`fade-up ${visible ? 'visible' : ''}`}>{children}</div>;
}

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);

  // Intercept Supabase email confirmation hash fragments (#access_token=...&type=signup)
  // and redirect to the branded confirmation page
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const type = params.get('type');
      if (type === 'signup' || type === 'email_confirmation' || params.get('access_token')) {
        window.location.replace('/email-confirmed?type=signup&status=complete');
        return;
      }
    }
  }, []);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      {/* NAV */}
      <nav id="nav" className={navScrolled ? 'scrolled' : ''}>
        <a href="#" className="logo">
          <img src="/logo/padmagnet-header.png" alt="PadMagnet — Find Your Perfect Rental with PadScore" className="logo-header-img" />
        </a>
{/* nav-cta removed — was rendering off-screen on mobile */}
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Coming soon to Florida&apos;s Treasure and Gold Coast
            </div>
            <h1 className="hero-headline"><span>Swipe</span> right<svg className="swipe-arrow" viewBox="0 0 500 40" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#E8603C" stopOpacity="0.15"/><stop offset="60%" stopColor="#E8603C" stopOpacity="0.7"/><stop offset="100%" stopColor="#E8603C"/></linearGradient></defs><path d="M0 20 H450 L430 6 M450 20 L430 34" stroke="url(#arrowGrad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg><br />on your next rental home.</h1>
            <p className="hero-sub">
              Rental matching for Florida&apos;s Treasure Coast down through the entire Gold Coast, that&apos;s Fort Pierce to Miami and every town in between! — All powered by both live MLS data and Property Owner private listings!
            </p>
            <p className="hero-sub">
              Browse amazing rental homes. Swipe, match, communicate, move in. No stale listings. No broker runaround.
            </p>
            <WaitlistForm formId="hero" defaultRole="tenant" showRoleSelector={true} theme="light" />
            <p className="hero-trust">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Free for tenants. Always.
            </p>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="section-inner">
          <FadeUp>
            <p className="section-label">How It Works</p>
            <h2 className="section-title">Find your place in three moves.</h2>
            <p className="section-sub">Forget endless scrolling through stale listings on Zillow. PadMagnet shows you one rental at a time — swipe right to save it, left to skip. It&apos;s that simple.</p>
          </FadeUp>
          <div className="steps-grid">
            <FadeUp><div className="step-card"><span className="step-number">1</span><div className="step-icon coral">🎯</div><h3 className="step-title">Set your criteria</h3><p className="step-desc">Tell us your budget, preferred bedrooms, pet needs, and target area anywhere from Fort Pierce to Miami. We&apos;ll curate your deck.</p></div></FadeUp>
            <FadeUp><div className="step-card"><span className="step-number">2</span><div className="step-icon sage">👆</div><h3 className="step-title">Swipe through rentals</h3><p className="step-desc">Browse real MLS-powered listings one card at a time. Swipe right to save your favorites, left to pass. It&apos;s fast and visual.</p></div></FadeUp>
            <FadeUp><div className="step-card"><span className="step-number">3</span><div className="step-icon navy">🤝</div><h3 className="step-title">Get matched</h3><p className="step-desc">When you swipe right, the property owner sees your profile. If it&apos;s a fit, you connect directly — no middleman, no mystery.</p></div></FadeUp>
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="audience">
        <div className="section-inner">
          <FadeUp>
            <p className="section-label">Built for Both Sides</p>
            <h2 className="section-title">Whether you&apos;re looking or listing.</h2>
          </FadeUp>
          <div className="audience-grid">
            <FadeUp>
              <div className="audience-card tenant">
                <p className="audience-card-label">For Tenants</p>
                <h3>Your next home is one swipe away.</h3>
                <p>Ditch the Craigslist chaos and the Zillow rabbit hole. PadMagnet pulls live rental data and lets you browse like a dating app — one gorgeous card at a time.</p>
                <ul className="audience-perks">
                  <li><span className="perk-check">✓</span> Always 100% free to use</li>
                  <li><span className="perk-check">✓</span> Real-time MLS-powered listings</li>
                  <li><span className="perk-check">✓</span> Swipe, save, and compare favorites</li>
                  <li><span className="perk-check">✓</span> Connect directly with property owners</li>
                </ul>
              </div>
            </FadeUp>
            <FadeUp>
              <div className="audience-card landlord">
                <p className="audience-card-label">For Property Owners</p>
                <h3>Stop paying for yard signs and praying.</h3>
                <p>PadMagnet puts your vacancy in front of tenants who are actively searching in your area, at your price point. Less downtime. More qualified leads. No guesswork.</p>
                <ul className="audience-perks">
                  <li><span className="perk-check">✓</span> Free during our launch period</li>
                  <li><span className="perk-check">✓</span> See which tenants are interested</li>
                  <li><span className="perk-check">✓</span> Tenant profiles with budget &amp; preferences</li>
                  <li><span className="perk-check">✓</span> Fill vacancies faster</li>
                </ul>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section className="location-section">
        <div className="section-inner">
          <div className="location-grid">
            <FadeUp>
              <div className="location-map">
                <LocationMap />
              </div>
            </FadeUp>
            <FadeUp>
              <div className="location-details">
                <p className="section-label">Our Coverage</p>
                <h3>Hyperlocal by design.</h3>
                <p>We&apos;re not trying to be Zillow. PadMagnet serves one market and serves it well — Florida&apos;s Treasure and Gold Coasts. Every listing is real, every property owner is local, and the data comes straight from the MLS and private property owners.</p>
                <div className="county-tags">
                  {['Stuart', 'Jensen Beach', 'Hobe Sound', 'Port St. Lucie', 'Fort Pierce', 'Hollywood', 'Pembroke Pines', 'Pompano Beach', 'Coral Springs', 'Sunrise', 'Hallandale Beach', 'Miami', 'Miami Beach', 'Hialeah', 'Coral Gables', 'Homestead', 'Doral', 'Aventura', 'Kendall', 'North Miami'].map(c => (
                    <span key={c} className="county-tag">{c}</span>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="cta-section" id="waitlist">
        <div className="section-inner">
          <FadeUp>
            <h2 className="section-title">Don&apos;t miss your match.</h2>
            <p className="section-sub">We&apos;re launching soon across South Florida. Get early access and be first to swipe when we go live.</p>
            <WaitlistForm formId="cta" showRoleSelector={true} />
          </FadeUp>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <img src="/logo/padmagnet-icon-120-dark.png" alt="PadMagnet" width={28} height={28} style={{ borderRadius: 6, marginBottom: 8 }} />
        <p>&copy; 2026 PadMagnet LLC. Long-term rental matching for Florida&apos;s Treasure and Gold Coasts.</p>
        <p className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = ['ma','ilto:','sup','port','@pad','magnet','.com'].join(''); }} className="footer-link">
            Contact Us
          </a>
          <span className="footer-dot">&middot;</span>
          <a href="/privacy" className="footer-link">Privacy Policy</a>
          <span className="footer-dot">&middot;</span>
          <a href="/terms" className="footer-link">Terms of Service</a>
        </p>
      </footer>
    </>
  );
}
