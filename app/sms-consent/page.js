export const metadata = {
  title: 'SMS Consent & Opt-In — PadMagnet',
  description: 'How PadMagnet collects SMS consent from users. TCPA-compliant opt-in process for transactional text message notifications.',
};

export default function SmsConsentPage() {
  return (
    <>
      {/* Nav — matches padmagnet.com */}
      <nav style={{ position: 'relative', background: 'rgba(237,228,220,0.92)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(27,33,56,0.08)' }}>
        <a href="/" className="logo">
          <img src="/logo/padmagnet-icon-120.png" alt="" width={38} height={38} style={{ borderRadius: 10 }} />
          <span className="logo-text">
            <span style={{ color: 'var(--navy)' }}>Pad</span>
            <span style={{ color: 'var(--coral)' }}>Magnet</span>
          </span>
        </a>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 60px' }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: 'var(--navy)', marginBottom: 8, lineHeight: 1.15 }}>
          SMS Consent & Opt-In
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 40, lineHeight: 1.7 }}>
          PadMagnet collects explicit, informed consent from users before sending any SMS text messages.
          This page documents our TCPA-compliant opt-in process.
        </p>

        {/* Section 1 */}
        <Section title="1. How Users Opt In">
          <p>
            SMS consent is collected <strong>exclusively within the PadMagnet mobile application</strong> through
            the Notification Settings screen. Users must manually toggle on
            &ldquo;SMS Notifications&rdquo; — an affirmative action — before any text messages are sent.
          </p>
          <p style={{ marginTop: 12 }}>
            <strong>SMS is never enabled by default.</strong> Consent is collected separately from account registration.
            Users can fully use PadMagnet without enabling SMS. SMS consent is not a condition of purchase or use of the app.
          </p>
        </Section>

        {/* Section 2: Mockup */}
        <Section title="2. In-App Opt-In Flow">
          <p style={{ marginBottom: 24 }}>
            Below is the exact opt-in flow within the PadMagnet mobile app. Users navigate to
            Settings → Notification Settings to find the SMS toggle.
          </p>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            {/* Phone: Before */}
            <PhoneMockup
              label="Step 1 — SMS is OFF by default"
              highlight={false}
            >
              <ToggleRow on={false} />
              <div style={{ padding: '20px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>Toggle SMS to see the consent disclosure and enter your phone number.</p>
              </div>
            </PhoneMockup>

            <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, color: 'var(--coral)', fontWeight: 700 }}>→</div>

            {/* Phone: After */}
            <PhoneMockup
              label="Step 2 — User toggles ON, sees disclosure"
              highlight={true}
            >
              <ToggleRow on={true} />
              {/* Disclosure */}
              <div style={{
                margin: '12px 16px', padding: '10px 12px',
                background: 'rgba(59,130,246,0.08)', borderRadius: 8,
                border: '1px solid rgba(59,130,246,0.2)',
              }}>
                <p style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>
                  By enabling SMS, you consent to receive transactional text message notifications from
                  PadMagnet (e.g., inquiry alerts, listing reminders, message notifications). Consent is
                  not a condition of purchase or use of the app. Msg &amp; data rates may apply. Msg frequency
                  varies, typically 1-5 per week. Reply STOP to unsubscribe at any time.
                </p>
                <p style={{ fontSize: 11, color: '#3b82f6', marginTop: 6 }}>
                  Privacy Policy · Terms of Service
                </p>
              </div>
              {/* Phone input */}
              <div style={{ padding: '8px 20px 16px' }}>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Phone Number</p>
                <div style={{
                  background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                  padding: '10px 12px', fontSize: 14, color: '#fff',
                }}>
                  (772) 555-0123
                </div>
              </div>
            </PhoneMockup>
          </div>
        </Section>

        {/* Section 3: Disclosure Text */}
        <Section title="3. TCPA Disclosure (Exact Text)">
          <div style={{
            background: 'var(--cream-dark)', borderRadius: 12, padding: 20,
            border: '1px solid #e2d8cf', fontSize: 15, color: 'var(--navy)',
            lineHeight: 1.7, fontStyle: 'italic',
          }}>
            &ldquo;By enabling SMS, you consent to receive transactional text message notifications from
            PadMagnet (e.g., inquiry alerts, listing reminders, message notifications). Consent is
            not a condition of purchase or use of the app. Msg &amp; data rates may apply. Msg frequency
            varies based on account activity, typically 1-5 per week. Reply STOP to unsubscribe at
            any time.&rdquo;
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
            The disclosure includes links to our{' '}
            <a href="/privacy" style={{ color: 'var(--coral)' }}>Privacy Policy</a> and{' '}
            <a href="/terms" style={{ color: 'var(--coral)' }}>Terms of Service</a> (Section 7: SMS Terms).
          </p>
        </Section>

        {/* Section 4: Message Types */}
        <Section title="4. Message Types">
          <p style={{ marginBottom: 16 }}>
            PadMagnet sends only <strong>transactional SMS notifications</strong> related to user activity.
            No marketing or promotional messages are sent.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--coral)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--navy)' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--navy)' }}>Recipient</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--navy)' }}>Example</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['New inquiry alert', 'Owner', '"PadMagnet: A tenant is interested in your listing at 1234 SE Magnolia Ave, Hobe Sound. Open the app to view their message."'],
                  ['Listing expiry reminder', 'Owner', '"PadMagnet: Your listing at 1234 SE Magnolia Ave expires in 3 days. Renew your pass to stay visible to tenants. Reply STOP to opt out."'],
                  ['New message notification', 'Tenant', '"PadMagnet: You have a new message from a property owner about 8075 SE Palm St, Hobe Sound. Open PadMagnet to read it."'],
                  ['Listing activation', 'Owner', '"PadMagnet: Your listing is now live! Tenants in your area can see 1234 SE Magnolia Ave in their feed. Manage it anytime in the app."'],
                  ['Delivery confirmation', 'Both', '"PadMagnet: Your message to the property owner was delivered. You\'ll be notified when they reply. Reply STOP to opt out of SMS."'],
                ].map(([type, recipient, example], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2d8cf' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--navy)' }}>{type}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{recipient}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Section 5: Opt-Out */}
        <Section title="5. How Users Opt Out">
          <p style={{ marginBottom: 16 }}>
            Users can opt out of SMS notifications at any time through any of these methods:
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: '💬', title: 'Reply STOP', desc: 'Text STOP to the PadMagnet number. Immediately unsubscribed. Confirmation sent.' },
              { icon: '📱', title: 'In-App Toggle', desc: 'Toggle off "SMS Notifications" in the app\'s Notification Settings screen at any time.' },
              { icon: '🔑', title: 'Keyword Variants', desc: 'OPTOUT, CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, STOPALL — all honored immediately.' },
            ].map((m, i) => (
              <div key={i} style={{
                flex: '1 1 200px', background: 'var(--white)', borderRadius: 12,
                padding: 20, border: '1px solid #e2d8cf', boxShadow: 'var(--shadow-soft)',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 6: Compliance */}
        <Section title="6. Compliance Summary">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['Sender', 'PadMagnet LLC'],
                ['Phone Number', '(253) 600-3665'],
                ['Caller ID', 'PadMagnet'],
                ['Message Prefix', 'All messages begin with "PadMagnet:"'],
                ['Content', 'Transactional only — no marketing or promotional messages'],
                ['Frequency', '1-5 messages per week based on account activity'],
                ['Opt-In', 'In-app toggle with full TCPA disclosure (explicit, affirmative consent)'],
                ['Opt-Out', 'Reply STOP, in-app toggle, or any standard keyword'],
                ['HELP Response', '"Reply STOP to unsubscribe. Msg & Data Rates May Apply."'],
                ['Privacy Policy', 'padmagnet.com/privacy'],
                ['Terms of Service', 'padmagnet.com/terms (Section 7: SMS Terms)'],
              ].map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2d8cf' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--navy)', fontFamily: "'Outfit', sans-serif", width: '30%' }}>{label}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      {/* Footer — matches padmagnet.com */}
      <footer>
        <img src="/logo/padmagnet-icon-120-dark.png" alt="PadMagnet" width={28} height={28} style={{ borderRadius: 6, marginBottom: 8 }} />
        <p>&copy; 2026 PadMagnet LLC. Long-term rental matching for Florida&apos;s Treasure and Gold Coasts.</p>
        <p className="footer-links">
          <a href="mailto:support@padmagnet.com" className="footer-link">Contact Us</a>
          <span className="footer-dot">&middot;</span>
          <a href="/privacy" className="footer-link">Privacy Policy</a>
          <span className="footer-dot">&middot;</span>
          <a href="/terms" className="footer-link">Terms of Service</a>
        </p>
      </footer>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 16, padding: 32,
      border: '1px solid #e2d8cf', marginBottom: 24,
      boxShadow: 'var(--shadow-soft)',
    }}>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 16, lineHeight: 1.2 }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function PhoneMockup({ label, highlight, children }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif",
      }}>
        {label}
      </div>
      <div style={{
        width: 280, background: '#0f1724', borderRadius: 28, padding: '20px 0 8px',
        border: highlight ? '2px solid var(--coral)' : '2px solid #334155',
        boxShadow: highlight ? '0 8px 32px rgba(232,96,60,0.15)' : '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        {/* Notch */}
        <div style={{ width: 100, height: 6, background: '#1e293b', borderRadius: 3, margin: '0 auto 12px' }} />
        {/* Screen title */}
        <div style={{ padding: '0 20px 14px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Notification Settings</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ on }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>SMS Notifications</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Receive text message notifications</div>
        </div>
        <div style={{
          width: 44, height: 24, borderRadius: 12,
          background: on ? '#3b82f6' : '#334155', position: 'relative',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 10,
            background: '#fff', position: 'absolute',
            top: 2, left: on ? 22 : 2,
            transition: 'left 0.2s',
          }} />
        </div>
      </div>
    </div>
  );
}
