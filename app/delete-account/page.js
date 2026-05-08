export const metadata = {
  title: 'Delete Your Account — PadMagnet',
  description: 'How to request deletion of your PadMagnet account and associated data.',
};

export default function DeleteAccountPage() {
  return (
    <>
      <nav className="scrolled">
        <a href="/" className="logo">
          <img src="/logo/padmagnet-header.png" alt="PadMagnet — Find Your Perfect Rental with PadScore" className="logo-header-img" />
        </a>
      </nav>

      <section className="page-content">
        <div className="section-inner" style={{ maxWidth: 840 }}>
          <h1 className="section-title">Delete Your Account</h1>
          <p className="section-sub" style={{ marginBottom: 40 }}>
            Last updated: May 7, 2026
          </p>

          <div className="legal-card">
            <h2>About PadMagnet</h2>
            <p>PadMagnet is a rental-listings app published by <strong>PadMagnet LLC</strong> (&ldquo;PadMagnet,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;), based in Stuart, Florida. This page explains how you can permanently delete your account and the data associated with it.</p>
          </div>

          <div className="legal-card">
            <h2>Two ways to delete your account</h2>

            <h3 style={{ marginTop: 24 }}>Option 1 — Delete from inside the PadMagnet app (recommended)</h3>
            <ol>
              <li>Open the PadMagnet mobile app and sign in to the account you want to delete.</li>
              <li>Tap the <strong>Profile</strong> tab.</li>
              <li>Tap <strong>Settings</strong>, then scroll to the bottom of the screen.</li>
              <li>Tap <strong>Delete Account</strong>.</li>
              <li>Confirm by entering your email address when prompted.</li>
              <li>Your account and associated data will be queued for deletion immediately.</li>
            </ol>

            <h3 style={{ marginTop: 24 }}>Option 2 — Email request</h3>
            <p>If you can no longer access the app or prefer to request deletion in writing, send an email to <a href="mailto:hello@padmagnet.com">hello@padmagnet.com</a> with the subject line &ldquo;Delete my account&rdquo; from the email address registered on your PadMagnet account. Include your full name on file. We will verify the request and complete the deletion within 30 days.</p>
          </div>

          <div className="legal-card">
            <h2>What gets deleted</h2>
            <p>When you request deletion, the following data is permanently removed from PadMagnet&apos;s systems:</p>
            <ul>
              <li>Your profile (name, display name, email, phone number, role, tier status, PadPoints balance)</li>
              <li>Your authentication credentials and any saved sign-in sessions</li>
              <li>All listings you created (including photos uploaded to our storage)</li>
              <li>All conversations and messages you sent or received</li>
              <li>Your saved listings, swipes, search zones, and search history</li>
              <li>Your Ask Pad AI chat history</li>
              <li>Your push notification tokens and device identifiers</li>
              <li>Your payment customer record (Stripe customer ID is detached)</li>
            </ul>
          </div>

          <div className="legal-card">
            <h2>What may be kept</h2>
            <p>Some information may be retained after account deletion for legal, regulatory, or operational reasons:</p>
            <ul>
              <li><strong>Transaction records (up to 7 years)</strong> — Stripe payment records are retained by Stripe per its own retention policy and applicable tax/anti-fraud laws. PadMagnet only stores a reference to the Stripe customer ID; the actual payment data lives with Stripe.</li>
              <li><strong>Audit logs (up to 12 months)</strong> — anonymized administrative logs of account creation, deletion, and policy actions are retained without identifying you.</li>
              <li><strong>Aggregate analytics</strong> — non-identifying aggregate statistics (e.g., total swipes per day across all users) are retained indefinitely. These cannot be traced back to you.</li>
              <li><strong>Legal-hold records</strong> — if a deletion request would conflict with an active legal obligation (subpoena, fraud investigation, dispute resolution), the affected records may be retained until the obligation is resolved.</li>
            </ul>
          </div>

          <div className="legal-card">
            <h2>Timing</h2>
            <p>In-app deletions begin immediately upon confirmation. Email-based deletion requests are processed within 30 days of receipt. After deletion completes, residual cached copies in third-party services (e.g., email delivery logs at Resend, SMS logs at Twilio) age out per those services&apos; own retention windows, typically 30&ndash;90 days.</p>
          </div>

          <div className="legal-card">
            <h2>Questions</h2>
            <p>If you have questions about account deletion, your data, or PadMagnet&apos;s privacy practices generally, contact us at <a href="mailto:privacy@padmagnet.com">privacy@padmagnet.com</a>. See also our <a href="/privacy">Privacy Policy</a>.</p>
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
