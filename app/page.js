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
          <button type="button" className={`role-btn ${theme === 'light' ? 'role-btn-light' : ''} ${role === 'landlord' ? 'active' : ''}`} onClick={() => setRole('landlord')}>
            🔑 I&apos;m a Landlord
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
      setSwiping(prev => positions[0]);
      setTimeout(() => {
        setPositions(prev => {
          const next = [...prev];
          next.push(next.shift());
          return next;
        });
        setSwiping(-1);
      }, 500);
    }, 3000);
    return () => clearInterval(interval);
  }, [positions]);

  const cards = [
    { cls: 'card-1', price: '$2,100/mo', addr: '3 bd · 2 ba · Stuart, FL', tags: ['🏊 Pool', '🐕 Pets OK'], img: '/images/card1.jpg', alt: 'Rental home in Stuart, FL' },
    { cls: 'card-2', price: '$1,850/mo', addr: '2 bd · 2 ba · PSL, FL', tags: ['🏠 Garage'], img: '/images/card2.jpg', alt: 'Rental home in Port St. Lucie, FL' },
    { cls: 'card-3', price: '$2,400/mo', addr: '4 bd · 3 ba · Hobe Sound', tags: ['🌴 Yard', '🏊 Pool'], img: '/images/card3.jpg', alt: 'Rental home in Hobe Sound, FL' },
  ];

  return (
    <div className="hero-visual">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="phone-header">
            <span className="phone-header-text">Near You</span>
          </div>
          <div className="swipe-stack">
            {cards.map((card, i) => {
              const pos = positions.indexOf(i);
              return (
                <div key={i} className={`swipe-card ${card.cls} ${swiping === i ? 'swiping' : ''}`} data-pos={pos}>
                  <img src={card.img} alt={card.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="eager" />
                  <div className="swipe-card-content">
                    <div className="swipe-card-price">{card.price}</div>
                    <div className="swipe-card-address">{card.addr}</div>
                    <div className="swipe-card-tags">
                      {card.tags.map((t, j) => <span key={j} className="swipe-tag">{t}</span>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="phone-actions">
            <div className="phone-btn nope">✕</div>
            <div className="phone-btn like">♥</div>
          </div>
          <div className="phone-branding">
            <img src="/logo/padmagnet-header.png" alt="PadMagnet" className="phone-branding-img" />
          </div>
        </div>
      </div>
    </div>
  );
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
          <img src="/logo/padmagnet-header.png" alt="PadMagnet — Find Your Perfect Pad with PadScore" className="logo-header-img" />
        </a>
        <a href="#waitlist" className="nav-cta">Join Waitlist</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Coming soon — Martin &amp; St. Lucie County
            </div>
            <h1><span>Swipe</span> right<br />on your next home.</h1>
            <p className="hero-sub">
              Rental matching for Florida&apos;s Treasure Coast — powered by live MLS data.
              Browse homes like a dating app. Swipe, match, move in.
              No stale listings. No broker runaround.
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
            <FadeUp><div className="step-card"><span className="step-number">1</span><div className="step-icon coral">🎯</div><h3 className="step-title">Set your criteria</h3><p className="step-desc">Tell us your budget, preferred bedrooms, pet needs, and target area across Martin or St. Lucie County. We&apos;ll curate your deck.</p></div></FadeUp>
            <FadeUp><div className="step-card"><span className="step-number">2</span><div className="step-icon sage">👆</div><h3 className="step-title">Swipe through rentals</h3><p className="step-desc">Browse real MLS-powered listings one card at a time. Swipe right to save your favorites, left to pass. It&apos;s fast and visual.</p></div></FadeUp>
            <FadeUp><div className="step-card"><span className="step-number">3</span><div className="step-icon navy">🤝</div><h3 className="step-title">Get matched</h3><p className="step-desc">When you swipe right, the landlord sees your profile. If it&apos;s a fit, you connect directly — no middleman, no mystery.</p></div></FadeUp>
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
                  <li><span className="perk-check">✓</span> Connect directly with landlords</li>
                </ul>
              </div>
            </FadeUp>
            <FadeUp>
              <div className="audience-card landlord">
                <p className="audience-card-label">For Landlords</p>
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
                <div className="map-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F06449" strokeWidth="1.5" opacity="0.5">
                    <path d="M12 2C8 2 4 5 4 10c0 7 8 12 8 12s8-5 8-12c0-5-4-8-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Florida&apos;s Treasure Coast</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Martin &amp; St. Lucie Counties</p>
                </div>
              </div>
            </FadeUp>
            <FadeUp>
              <div className="location-details">
                <p className="section-label">Our Coverage</p>
                <h3>Hyperlocal by design.</h3>
                <p>We&apos;re not trying to be Zillow. PadMagnet serves one market and serves it well — Florida&apos;s Treasure Coast. Every listing is real, every landlord is local, and the data comes straight from the MLS.</p>
                <div className="county-tags">
                  {['Stuart', 'Port St. Lucie', 'Jensen Beach', 'Hobe Sound', 'Palm City', 'Fort Pierce', 'Tradition', 'Indiantown'].map(c => (
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
            <p className="section-sub">We&apos;re launching soon on the Treasure Coast. Get early access and be first to swipe when we go live.</p>
            <WaitlistForm formId="cta" showRoleSelector={true} />
          </FadeUp>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <img src="/logo/padmagnet-icon-120.png" alt="PadMagnet" width={28} height={28} style={{ borderRadius: 6, marginBottom: 8 }} />
        <p>&copy; 2026 PadMagnet. Long-term rental matching for Florida&apos;s Treasure Coast.</p>
      </footer>
    </>
  );
}
