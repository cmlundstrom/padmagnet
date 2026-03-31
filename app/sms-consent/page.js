export const metadata = {
  title: 'SMS Consent & Opt-In — PadMagnet',
  description: 'How PadMagnet collects SMS consent from users. TCPA-compliant opt-in process for transactional text message notifications.',
};

export default function SmsConsentPage() {
  return (
    <>
      {/* NAV — identical to padmagnet.com landing page */}
      <nav className="scrolled">
        <a href="/" className="logo">
          <img src="/logo/padmagnet-header.png" alt="PadMagnet — Find Your Perfect Rental with PadScore" className="logo-header-img" />
        </a>
      </nav>

      {/* Content — uses section-inner pattern from landing page */}
      <section className="page-content">
        <div className="section-inner" style={{ maxWidth: 840 }}>
          <h1 className="section-title">SMS Consent &amp; Opt-In</h1>
          <p className="section-sub" style={{ marginBottom: 40 }}>
            PadMagnet collects explicit, informed consent from users before sending any SMS text messages.
            This page documents our TCPA-compliant opt-in process.
          </p>

          {/* 1. How Users Opt In */}
          <div className="legal-card">
            <h2>1. How Users Opt In</h2>
            <p>
              SMS consent is collected <strong>exclusively within the PadMagnet mobile application</strong> through
              the Notification Settings screen. Users must manually toggle on
              &ldquo;SMS Notifications&rdquo; — an affirmative action — before any text messages are sent.
            </p>
            <p>
              <strong>SMS is never enabled by default.</strong> Consent is collected separately from account registration.
              Users can fully use PadMagnet without enabling SMS. SMS consent is not a condition of purchase or use of the app.
            </p>
            <p>
              <strong>We will not share, sell, or distribute your mobile phone number or any information collected
              through SMS opt-in to third parties for marketing or promotional purposes.</strong> Mobile information
              collected as part of our SMS notification service is used solely to deliver the transactional
              messages you have consented to receive.
            </p>
          </div>

          {/* 2. In-App Opt-In Flow */}
          <div className="legal-card">
            <h2>2. In-App Opt-In Flow</h2>
            <p style={{ marginBottom: 24 }}>
              Below are real screenshots from the PadMagnet mobile app (Samsung Galaxy S24).
              Users navigate to Profile → Settings → Notifications to find the SMS toggle.
            </p>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center', flex: '1 1 280px', maxWidth: 320 }}>
                <div className="phone-label">Step 1 — SMS is OFF by default</div>
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <img
                    src="/sms-consent/sms-toggle-off.jpg"
                    alt="PadMagnet Notification Settings — default state with Push OFF, SMS OFF, In-App Only selected"
                    style={{ width: '100%', borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: '18%', left: '-8%',
                    color: '#EF4444', fontSize: 36, fontWeight: 900,
                    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    transform: 'rotate(25deg)',
                  }}>
                    ➜
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                  Default state: Push OFF, SMS OFF, &ldquo;In-App Only&rdquo; selected.
                  Toggle uses muted gray track and thumb when inactive.
                </p>
              </div>

              <div style={{ textAlign: 'center', flex: '1 1 280px', maxWidth: 320 }}>
                <div className="phone-label">Step 2 — User toggles ON, sees disclosure</div>
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <img
                    src="/sms-consent/sms-toggle-on.jpg"
                    alt="PadMagnet Notification Settings — SMS enabled with green ON toggle, phone number entered, full TCPA disclosure and policy links visible"
                    style={{ width: '100%', borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)' }}
                  />
                  <div style={{
                    position: 'absolute', top: '35%', left: '-8%',
                    color: '#EF4444', fontSize: 36, fontWeight: 900,
                    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    transform: 'rotate(25deg)',
                  }}>
                    ➜
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                  User enables SMS: green &ldquo;ON&rdquo; toggle, phone number entered,
                  full TCPA disclosure with policy links visible below.
                </p>
              </div>
            </div>
          </div>

          {/* 3. TCPA Disclosure */}
          <div className="legal-card">
            <h2>3. TCPA Disclosure (Exact Text)</h2>
            <blockquote className="legal-quote">
              &ldquo;By enabling SMS, you consent to receive transactional text message notifications from
              PadMagnet (e.g., inquiry alerts, listing reminders, message notifications). Consent is
              not a condition of purchase or use of the app. Msg &amp; data rates may apply. Msg frequency
              varies based on account activity, typically 1–5 per week. Reply STOP to unsubscribe at
              any time. Reply HELP for help.&rdquo;
            </blockquote>
            <p>
              The disclosure includes links to our{' '}
              <a href="/privacy">Privacy Policy</a> and{' '}
              <a href="/terms">Terms of Service</a> (Section 7: SMS Terms).
            </p>
          </div>

          {/* 4. Message Types */}
          <div className="legal-card">
            <h2>4. Message Types Sent</h2>
            <p style={{ marginBottom: 16 }}>
              PadMagnet sends only <strong>transactional SMS notifications</strong> related to user activity.
              No marketing or promotional messages are sent.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Recipient</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>New inquiry alert</strong></td>
                    <td>Owner</td>
                    <td>&ldquo;PadMagnet: A tenant is interested in your listing at 1234 SE Magnolia Ave, Hobe Sound. Open the app to view their message.&rdquo;</td>
                  </tr>
                  <tr>
                    <td><strong>Listing expiry reminder</strong></td>
                    <td>Owner</td>
                    <td>&ldquo;PadMagnet: Your listing at 1234 SE Magnolia Ave expires in 3 days. Renew your pass to stay visible. Reply STOP to opt out.&rdquo;</td>
                  </tr>
                  <tr>
                    <td><strong>New message notification</strong></td>
                    <td>Tenant</td>
                    <td>&ldquo;PadMagnet: You have a new message from a property owner about 8075 SE Palm St. Open PadMagnet to read it.&rdquo;</td>
                  </tr>
                  <tr>
                    <td><strong>Listing activation</strong></td>
                    <td>Owner</td>
                    <td>&ldquo;PadMagnet: Your listing is now live! Tenants in your area can see 1234 SE Magnolia Ave. Manage it anytime in the app.&rdquo;</td>
                  </tr>
                  <tr>
                    <td><strong>Delivery confirmation</strong></td>
                    <td>Both</td>
                    <td>&ldquo;PadMagnet: Your message to the property owner was delivered. You&apos;ll be notified when they reply. Reply STOP to opt out.&rdquo;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Opt-Out */}
          <div className="legal-card">
            <h2>5. How Users Opt Out</h2>
            <p style={{ marginBottom: 16 }}>
              Users can opt out of SMS notifications at any time:
            </p>
            <div className="opt-out-grid">
              <div className="opt-out-method">
                <div className="opt-out-icon">💬</div>
                <h3>Reply STOP</h3>
                <p>Text STOP to the PadMagnet number. Immediately unsubscribed. Confirmation sent.</p>
              </div>
              <div className="opt-out-method">
                <div className="opt-out-icon">📱</div>
                <h3>In-App Toggle</h3>
                <p>Toggle off &ldquo;SMS Notifications&rdquo; in the app&apos;s Notification Settings screen at any time.</p>
              </div>
              <div className="opt-out-method">
                <div className="opt-out-icon">🔑</div>
                <h3>Keyword Variants</h3>
                <p>OPTOUT, CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, STOPALL — all honored immediately.</p>
              </div>
            </div>
          </div>

          {/* 6. Compliance Summary */}
          <div className="legal-card">
            <h2>6. Compliance Summary</h2>
            <table className="legal-table">
              <tbody>
                <tr><td><strong>Sender</strong></td><td>PadMagnet LLC</td></tr>
                <tr><td><strong>Phone Number</strong></td><td>(253) 600-3665</td></tr>
                <tr><td><strong>Caller ID</strong></td><td>PadMagnet</td></tr>
                <tr><td><strong>Message Prefix</strong></td><td>All messages begin with &ldquo;PadMagnet:&rdquo;</td></tr>
                <tr><td><strong>Content</strong></td><td>Transactional only — no marketing or promotional messages</td></tr>
                <tr><td><strong>Frequency</strong></td><td>1-5 messages per week based on account activity</td></tr>
                <tr><td><strong>Opt-In</strong></td><td>In-app toggle with full TCPA disclosure (explicit, affirmative consent)</td></tr>
                <tr><td><strong>Opt-Out</strong></td><td>Reply STOP, in-app toggle, or any standard keyword</td></tr>
                <tr><td><strong>HELP Response</strong></td><td>&ldquo;PadMagnet SMS Notifications. Reply STOP to opt out. Msg &amp; data rates may apply. For help: support@padmagnet.com&rdquo;</td></tr>
                <tr><td><strong>Privacy Policy</strong></td><td><a href="/privacy">padmagnet.com/privacy</a></td></tr>
                <tr><td><strong>Terms of Service</strong></td><td><a href="/terms">padmagnet.com/terms</a> (Section 7: SMS Terms)</td></tr>
              </tbody>
            </table>
          </div>
          {/* 7. Terms of Service — SMS Section (inline for reviewer convenience) */}
          <div className="legal-card">
            <h2>7. Terms of Service — SMS Terms (Section 7)</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              The following is reproduced from our <a href="/terms">Terms of Service</a> Section 7 for convenience:
            </p>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
              <p><strong style={{ color: '#0B1D3A' }}>Opt-In:</strong> You must explicitly opt in to receive SMS messages by enabling &ldquo;SMS Notifications&rdquo; in the PadMagnet app&apos;s Notification Settings. Your consent to receive SMS is not a condition of purchase or use of the PadMagnet platform.</p>
              <p style={{ marginTop: 10 }}><strong style={{ color: '#0B1D3A' }}>Message Frequency:</strong> Message frequency varies based on your account activity, typically 1–5 messages per week.</p>
              <p style={{ marginTop: 10 }}><strong style={{ color: '#0B1D3A' }}>Fees:</strong> Message and data rates may apply. PadMagnet does not charge for SMS, but your mobile carrier may apply standard messaging fees.</p>
              <p style={{ marginTop: 10 }}><strong style={{ color: '#0B1D3A' }}>Opt-Out:</strong> You may opt out of SMS at any time by replying STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, or QUIT to any PadMagnet message. You will receive one final confirmation message and no further texts will be sent.</p>
              <p style={{ marginTop: 10 }}><strong style={{ color: '#0B1D3A' }}>Help:</strong> Reply HELP to any PadMagnet message for support, or contact us at support@padmagnet.com.</p>
              <p style={{ marginTop: 10 }}><strong style={{ color: '#0B1D3A' }}>Phone Number Linking:</strong> Your phone number is linked to your PadMagnet user account to route notifications. We do not share, sell, or transfer your phone number or messaging consent to third parties.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — identical to padmagnet.com landing page */}
      <footer>
        <img src="/logo/padmagnet-icon-120-dark.png" alt="PadMagnet" width={28} height={28} style={{ borderRadius: 6, marginBottom: 8 }} />
        <p>&copy; 2026 PadMagnet LLC. Long-term rental matching for Florida&apos;s Treasure and Gold Coasts.</p>
        <p className="footer-links">
          <a href="mailto:support@padmagnet.com" className="footer-link">Contact Us</a>
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
