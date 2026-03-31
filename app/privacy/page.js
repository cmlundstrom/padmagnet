export const metadata = {
  title: 'Privacy Policy — PadMagnet',
  description: 'PadMagnet privacy policy. How we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <nav className="scrolled">
        <a href="/" className="logo">
          <img src="/logo/padmagnet-header.png" alt="PadMagnet — Find Your Perfect Rental with PadScore" className="logo-header-img" />
        </a>
      </nav>

      <section className="page-content">
        <div className="section-inner" style={{ maxWidth: 840 }}>
          <h1 className="section-title">Privacy Policy</h1>
          <p className="section-sub" style={{ marginBottom: 40 }}>
            Last updated: March 22, 2026
          </p>

          <div className="legal-card">
            <h2>1. Information We Collect</h2>
            <p>PadMagnet LLC (&ldquo;PadMagnet,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects information you provide when creating an account, including your name, email address, phone number, and rental preferences. For property owners, we also collect listing details such as property address, photos, and pricing.</p>
          </div>

          <div className="legal-card">
            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and improve our rental matching services</li>
              <li>Calculate PadScore&trade; recommendations based on your preferences</li>
              <li>Facilitate communication between tenants and property owners</li>
              <li>Send transactional emails (listing confirmations, expiry reminders)</li>
              <li>Send notifications you have opted in to (push, email, SMS — see our <a href="/sms-consent">SMS Consent &amp; Opt-In</a> page for details)</li>
              <li>Process payments through our payment processor (Stripe)</li>
            </ul>
          </div>

          <div className="legal-card">
            <h2>3. Information Sharing</h2>
            <p>We do not sell your personal information. We share data only with:</p>
            <ul>
              <li><strong>Service providers:</strong> Supabase (database/auth), Stripe (payments), Resend (email), Twilio (SMS), Expo (push notifications), Google (maps/geocoding)</li>
              <li><strong>Other users:</strong> Tenant contact information is shared with listing owners only when a tenant initiates a conversation</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <blockquote className="legal-quote">
              <strong>Mobile Information:</strong> We will not share, sell, or distribute your mobile phone number or any information collected through SMS opt-in to third parties for marketing or promotional purposes. Mobile information collected as part of our SMS notification service is used solely to deliver the transactional messages you have consented to receive. See our <a href="/sms-consent">SMS Consent &amp; Opt-In</a> page for full details on our SMS practices.
            </blockquote>
          </div>

          <div className="legal-card">
            <h2>4. MLS Data</h2>
            <p>Rental listing data sourced from the MLS (Multiple Listing Service) is displayed under an IDX data exchange agreement with the Southeast Florida MLS. This data is provided for consumers&apos; personal, non-commercial use and may not be used for any purpose other than identifying prospective properties consumers may be interested in leasing.</p>
          </div>

          <div className="legal-card">
            <h2>5. Data Security</h2>
            <p>We use industry-standard security measures including encrypted data transmission (TLS), secure token storage, row-level security on our database, and input sanitization. Payment information is processed by Stripe and never stored on our servers.</p>
          </div>

          <div className="legal-card">
            <h2>6. Your Rights</h2>
            <p>You may:</p>
            <ul>
              <li>Access and update your personal information through the app</li>
              <li>Delete your account by contacting us</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Request a copy of your data</li>
            </ul>
            <p>California residents have additional rights under the CCPA. Contact us at <strong>privacy@padmagnet.com</strong> to exercise these rights.</p>
          </div>

          <div className="legal-card">
            <h2>7. Cookies &amp; Analytics</h2>
            <p>Our website uses essential cookies for functionality. We do not use third-party tracking or advertising cookies.</p>
          </div>

          <div className="legal-card">
            <h2>8. Children&apos;s Privacy</h2>
            <p>PadMagnet is not intended for users under 18. We do not knowingly collect information from children.</p>
          </div>

          <div className="legal-card">
            <h2>9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify users of material changes via email or in-app notification.</p>
          </div>

          <div className="legal-card">
            <h2>10. Contact Us</h2>
            <p>If you have questions about this privacy policy, contact us at:</p>
            <table className="legal-table">
              <tbody>
                <tr><td><strong>Company</strong></td><td>PadMagnet LLC</td></tr>
                <tr><td><strong>Privacy</strong></td><td>privacy@padmagnet.com</td></tr>
                <tr><td><strong>Support</strong></td><td>support@padmagnet.com</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
