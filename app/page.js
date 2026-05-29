'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================================
// PADMAGNET LANDING PAGE
// ============================================================

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.padmagnet.app';

function StoreButtons({ variant = 'light' }) {
  return (
    <div className={`store-buttons ${variant === 'dark' ? 'store-buttons-dark' : ''}`}>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="store-btn store-btn-live"
        aria-label="Get PadMagnet on Google Play"
      >
        <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.609 1.814a1 1 0 0 0-.609.92v18.532a1 1 0 0 0 .609.92L13.792 12 3.609 1.814z" fill="#00C8DA" />
          <path d="M16.81 8.989l-3.018 3.011 3.018 3.012 3.853-2.218a1 1 0 0 0 0-1.588L16.81 8.989z" fill="#FFCF47" />
          <path d="M3.609 1.814l10.183 10.186 3.018-3.011L4.67 1.71a1 1 0 0 0-1.06.103z" fill="#00F076" />
          <path d="M13.792 12L3.609 22.186a1 1 0 0 0 1.06.103l12.141-7.277L13.792 12z" fill="#FF3A44" />
        </svg>
        <span className="store-btn-text">
          <span className="store-btn-small">GET IT ON</span>
          <span className="store-btn-large">Google Play</span>
        </span>
      </a>
      <div
        className="store-btn store-btn-soon"
        aria-label="iOS App Store coming soon"
      >
        <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M17.05 12.536c-.026-2.737 2.226-4.054 2.328-4.118-1.27-1.854-3.247-2.108-3.95-2.137-1.68-.17-3.281 1.005-4.135 1.005-.866 0-2.168-.98-3.566-.953-1.834.027-3.523 1.058-4.467 2.687-1.905 3.296-.487 8.176 1.367 10.847.91 1.302 1.99 2.764 3.408 2.711 1.37-.054 1.885-.886 3.539-.886 1.642 0 2.117.886 3.55.853 1.466-.027 2.395-1.328 3.292-2.633 1.038-1.509 1.467-2.973 1.493-3.05-.033-.013-2.835-1.085-2.86-4.326zM14.38 4.456c.748-.912 1.255-2.18 1.116-3.452-1.078.046-2.397.722-3.171 1.633-.694.81-1.305 2.105-1.144 3.343 1.203.094 2.434-.61 3.198-1.524z" />
        </svg>
        <span className="store-btn-text">
          <span className="store-btn-small">COMING SOON TO</span>
          <span className="store-btn-large">App Store</span>
        </span>
        <span className="store-btn-soon-tag">SOON</span>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="hero-visual">
      <div className="phone-glow" aria-hidden="true" />
      <div className="phone-device">
        <div className="phone-screen-area">
          <img
            src="/images/hero-app-screenshot.jpg"
            alt="PadMagnet app — Stop searching, start matching. Browse houses, apartments, and condos with PadScore."
            className="phone-screen-img"
            loading="eager"
          />
        </div>
        <div className="phone-island" aria-hidden="true" />
        <div className="phone-side-btn phone-side-btn-volume-up" aria-hidden="true" />
        <div className="phone-side-btn phone-side-btn-volume-down" aria-hidden="true" />
        <div className="phone-side-btn phone-side-btn-power" aria-hidden="true" />
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
              Now live on Google Play — Florida&apos;s Treasure &amp; Gold Coast
            </div>
            <h1 className="hero-headline"><span>Swipe</span> right<svg className="swipe-arrow" viewBox="0 0 500 40" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#E8603C" stopOpacity="0.15"/><stop offset="60%" stopColor="#E8603C" stopOpacity="0.7"/><stop offset="100%" stopColor="#E8603C"/></linearGradient></defs><path d="M0 20 H450 L430 6 M450 20 L430 34" stroke="url(#arrowGrad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg><br />on your next rental home.</h1>
            <p className="hero-sub">
              Rental matching for Florida&apos;s Treasure Coast down through the entire Gold Coast, that&apos;s Fort Pierce to Miami and every town in between! — All powered by both live MLS data and Property Owner private listings!
            </p>
            <p className="hero-sub">
              Browse amazing rental homes. Swipe, match, communicate, move in. No stale listings. No broker runaround.
            </p>
            <StoreButtons variant="light" />
            <p className="hero-trust">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Free for renters. Always.
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
                <p className="audience-card-label">For Renters</p>
                <h3>Your next home is one swipe away.</h3>
                <p>Ditch the Craigslist chaos and the Zillow rabbit hole. PadMagnet pulls live rental data and lets you browse one gorgeous card at a time.</p>
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
                <p>PadMagnet puts your vacancy in front of renters who are actively searching in your area, at your price point. Less downtime. More qualified leads. No guesswork.</p>
                <ul className="audience-perks">
                  <li><span className="perk-check">✓</span> First 30 days free — pay only to renew</li>
                  <li><span className="perk-check">✓</span> See which renters are interested</li>
                  <li><span className="perk-check">✓</span> Renter profiles with budget &amp; preferences</li>
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
      <section className="cta-section" id="download">
        <div className="section-inner">
          <FadeUp>
            <h2 className="section-title">Your next swipe is waiting.</h2>
            <p className="section-sub">PadMagnet is live on Android across South Florida. Download free and start matching with real rentals tonight.</p>
            <StoreButtons variant="dark" />
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
          <span className="footer-dot">&middot;</span>
          <a href="/sms-consent" className="footer-link">SMS Consent</a>
        </p>
      </footer>
    </>
  );
}
