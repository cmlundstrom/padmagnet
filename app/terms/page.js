export const metadata = {
  title: 'Terms of Service — PadMagnet',
  description: 'PadMagnet terms of service. Rules and guidelines for using the PadMagnet platform.',
};

export default function TermsOfServicePage() {
  return (
    <>
      <nav className="scrolled">
        <a href="/" className="logo">
          <img src="/logo/padmagnet-header.png" alt="PadMagnet — Find Your Perfect Rental with PadScore" className="logo-header-img" />
        </a>
      </nav>

      <section className="page-content">
        <div className="section-inner" style={{ maxWidth: 840 }}>
          <h1 className="section-title">Terms of Service</h1>
          <p className="section-sub" style={{ marginBottom: 40 }}>
            Last updated: March 22, 2026
          </p>

          <div className="legal-card">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using PadMagnet (&ldquo;the Service&rdquo;), provided by PadMagnet LLC (&ldquo;we,&rdquo; &ldquo;us&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </div>

          <div className="legal-card">
            <h2>2. Description of Service</h2>
            <p>PadMagnet is a rental matching platform that connects tenants with rental properties in South Florida. We display listings sourced from the MLS (via IDX data exchange) and from property owners who list directly on our platform. PadScore&trade; is our proprietary matching algorithm that scores listings based on tenant preferences.</p>
          </div>

          <div className="legal-card">
            <h2>3. Eligibility</h2>
            <p>You must be at least 18 years old to use PadMagnet. By creating an account, you represent that you are at least 18 and that the information you provide is accurate.</p>
          </div>

          <div className="legal-card">
            <h2>4. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </div>

          <div className="legal-card">
            <h2>5. Property Owners</h2>
            <p>Property owners who list on PadMagnet represent that:</p>
            <ul>
              <li>They have the legal right to lease the property</li>
              <li>Listing information is accurate and current</li>
              <li>Photos are of the actual property</li>
              <li>They will comply with all applicable fair housing laws</li>
              <li>They will respond to tenant inquiries in good faith</li>
            </ul>
          </div>

          <div className="legal-card">
            <h2>6. Payments &amp; Passes</h2>
            <p>Owner tier passes (Pro, Premium) are one-time purchases valid for 30 days. Payments are processed by Stripe. All sales are final — passes cannot be refunded once activated. If you upgrade mid-pass, unused time on your current pass is credited toward the new purchase.</p>
          </div>

          <div className="legal-card">
            <h2>7. SMS / Text Messaging Terms</h2>
            <p>PadMagnet offers optional SMS text message notifications for account activity including new tenant inquiries, listing confirmations, listing expiry reminders, and message delivery alerts. For a complete description of our SMS consent process, including the in-app opt-in flow and all message types, visit our <a href="/sms-consent">SMS Consent &amp; Opt-In</a> page.</p>

            <p><strong>Opt-In:</strong> You must explicitly opt in to receive SMS messages by enabling &ldquo;SMS Notifications&rdquo; in the PadMagnet app&apos;s Notification Settings. Your consent to receive SMS is not a condition of purchase or use of the PadMagnet platform. By opting in, you consent to receive transactional text messages from PadMagnet at the phone number associated with your account.</p>

            <p><strong>Message Frequency:</strong> Message frequency varies based on your account activity, typically 1–5 messages per week.</p>

            <p><strong>Fees:</strong> Message and data rates may apply. PadMagnet does not charge for SMS, but your mobile carrier may apply standard messaging fees.</p>

            <p><strong>Opt-Out:</strong> You may opt out of SMS at any time by replying STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, or QUIT to any PadMagnet message. You will receive one final confirmation message and no further texts will be sent. You may also disable SMS in the app&apos;s Notification Settings.</p>

            <p><strong>Help:</strong> Reply HELP to any PadMagnet message for support, or contact us at support@padmagnet.com.</p>

            <p><strong>Phone Number Linking:</strong> Your phone number is linked to your PadMagnet user account to route notifications. We do not share, sell, or transfer your phone number or messaging consent to third parties.</p>

            <p>For details on how we handle your data, see our <a href="/privacy">Privacy Policy</a>.</p>
          </div>

          <div className="legal-card">
            <h2>8. MLS Data &amp; IDX Compliance</h2>
            <p>MLS listing data is provided under IDX agreement with the Southeast Florida MLS. This data is for personal, non-commercial use only. You may not:</p>
            <ul>
              <li>Copy, redistribute, or scrape MLS data</li>
              <li>Use listing data for automated valuation or AI/ML training</li>
              <li>Create derivative works from MLS data</li>
              <li>Contact listing agents for purposes unrelated to the listed property</li>
            </ul>
          </div>

          <div className="legal-card">
            <h2>9. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Post false, misleading, or discriminatory listing information</li>
              <li>Harass other users through the messaging system</li>
              <li>Attempt to circumvent payment requirements</li>
              <li>Use the platform for any illegal purpose</li>
              <li>Interfere with the operation of the Service</li>
              <li>Create multiple accounts to abuse free tier limits</li>
            </ul>
          </div>

          <div className="legal-card">
            <h2>10. Disclaimers</h2>
            <p>PadMagnet is a listing and matching platform — we are not a real estate broker, property manager, or landlord. We do not:</p>
            <ul>
              <li>Guarantee the accuracy of any listing information</li>
              <li>Verify the condition of properties</li>
              <li>Mediate disputes between tenants and owners</li>
              <li>Provide legal, financial, or real estate advice</li>
            </ul>
            <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND.</p>
          </div>

          <div className="legal-card">
            <h2>11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, PadMagnet LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, rental disputes, or property-related losses.</p>
          </div>

          <div className="legal-card">
            <h2>12. Intellectual Property</h2>
            <p>PadMagnet, PadScore, and all associated branding, design, and technology are the property of PadMagnet LLC. User-submitted content (photos, descriptions) remains the property of the submitter, with a license granted to PadMagnet to display it on the platform.</p>
          </div>

          <div className="legal-card">
            <h2>13. Termination</h2>
            <p>We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the app or by contacting support.</p>
          </div>

          <div className="legal-card">
            <h2>14. Governing Law</h2>
            <p>These terms are governed by the laws of the State of Florida. Any disputes shall be resolved in the courts of Martin County, Florida.</p>
          </div>

          <div className="legal-card">
            <h2>15. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>
          </div>

          <div className="legal-card">
            <h2>16. Contact</h2>
            <p>Questions about these terms? Contact us at:</p>
            <table className="legal-table">
              <tbody>
                <tr><td><strong>Company</strong></td><td>PadMagnet LLC</td></tr>
                <tr><td><strong>Legal</strong></td><td>legal@padmagnet.com</td></tr>
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
