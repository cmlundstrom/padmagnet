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
      <section style={{ paddingTop: 100 }}>
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
          </div>

          {/* 2. In-App Opt-In Flow */}
          <div className="legal-card">
            <h2>2. In-App Opt-In Flow</h2>
            <p style={{ marginBottom: 24 }}>
              Below is the opt-in flow within the PadMagnet mobile app. Users navigate to
              Settings → Notification Settings to find the SMS toggle.
            </p>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Phone: Before */}
              <div style={{ textAlign: 'center' }}>
                <div className="phone-label">Step 1 — SMS is OFF by default</div>
                <div className="phone-mock">
                  <div className="phone-notch" />
                  <div className="phone-title">Notification Settings</div>
                  <div className="phone-row">
                    <div>
                      <div className="phone-row-title">SMS Notifications</div>
                      <div className="phone-row-sub">Receive text message notifications</div>
                    </div>
                    <div className="phone-toggle off"><div className="phone-toggle-thumb" style={{ left: 2 }} /></div>
                  </div>
                  <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>Toggle SMS to see the consent disclosure and enter your phone number.</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, color: 'var(--coral)', fontWeight: 700 }}>→</div>

              {/* Phone: After */}
              <div style={{ textAlign: 'center' }}>
                <div className="phone-label">Step 2 — User toggles ON, sees disclosure</div>
                <div className="phone-mock active">
                  <div className="phone-notch" />
                  <div className="phone-title">Notification Settings</div>
                  <div className="phone-row">
                    <div>
                      <div className="phone-row-title">SMS Notifications</div>
                      <div className="phone-row-sub">Receive text message notifications</div>
                    </div>
                    <div className="phone-toggle on"><div className="phone-toggle-thumb" style={{ left: 22 }} /></div>
                  </div>
                  <div className="phone-disclosure">
                    <p>
                      By enabling SMS, you consent to receive transactional text message notifications from
                      PadMagnet (e.g., inquiry alerts, listing reminders, message notifications). Consent is
                      not a condition of purchase or use of the app. Msg &amp; data rates may apply. Msg frequency
                      varies, typically 1-5 per week. Reply STOP to unsubscribe at any time.
                    </p>
                    <p style={{ color: '#3b82f6', marginTop: 6 }}>
                      Privacy Policy · Terms of Service
                    </p>
                  </div>
                  <div style={{ padding: '8px 20px 16px' }}>
                    <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Phone Number</p>
                    <div className="phone-input">(772) 555-0123</div>
                  </div>
                </div>
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
              varies based on account activity, typically 1-5 per week. Reply STOP to unsubscribe at
              any time.&rdquo;
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
                <tr><td><strong>HELP Response</strong></td><td>&ldquo;Reply STOP to unsubscribe. Msg &amp; Data Rates May Apply.&rdquo;</td></tr>
                <tr><td><strong>Privacy Policy</strong></td><td><a href="/privacy">padmagnet.com/privacy</a></td></tr>
                <tr><td><strong>Terms of Service</strong></td><td><a href="/terms">padmagnet.com/terms</a> (Section 7: SMS Terms)</td></tr>
              </tbody>
            </table>
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
        </p>
      </footer>
    </>
  );
}
