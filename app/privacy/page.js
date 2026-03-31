export const metadata = {
  title: 'Privacy Policy — PadMagnet',
  description: 'PadMagnet privacy policy. How we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1D3A',
      color: '#FFFFFF',
      fontFamily: "'DM Sans', sans-serif",
      padding: '80px 24px 60px',
    }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <a href="/" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '14px' }}>← Back to PadMagnet</a>

        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 700, marginTop: '24px', marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#B0BEC5', fontSize: '14px', marginBottom: '32px' }}>
          Last updated: March 22, 2026
        </p>

        <div style={{ color: '#B0BEC5', fontSize: '15px', lineHeight: '1.7' }}>
          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>1. Information We Collect</h2>
          <p>PadMagnet LLC (&quot;PadMagnet,&quot; &quot;we,&quot; &quot;us&quot;) collects information you provide when creating an account, including your name, email address, phone number, and rental preferences. For property owners, we also collect listing details such as property address, photos, and pricing.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Provide and improve our rental matching services</li>
            <li>Calculate PadScore™ recommendations based on your preferences</li>
            <li>Facilitate communication between tenants and property owners</li>
            <li>Send transactional emails (listing confirmations, expiry reminders)</li>
            <li>Send notifications you have opted in to (push, email, SMS — see our <a href="/sms-consent" style={{ color: '#E8603C' }}>SMS Consent &amp; Opt-In</a> page for details)</li>
            <li>Process payments through our payment processor (Stripe)</li>
          </ul>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>3. Information Sharing</h2>
          <p>We do not sell your personal information. We share data only with:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li><strong>Service providers:</strong> Supabase (database/auth), Stripe (payments), Resend (email), Twilio (SMS), Expo (push notifications), Google (maps/geocoding)</li>
            <li><strong>Other users:</strong> Tenant contact information is shared with listing owners only when a tenant initiates a conversation</li>
            <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
          </ul>
          <p style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <strong style={{ color: '#FFFFFF' }}>Mobile Information:</strong> We will not share, sell, or distribute your mobile phone number or any information collected through SMS opt-in to third parties for marketing or promotional purposes. Mobile information collected as part of our SMS notification service is used solely to deliver the transactional messages you have consented to receive. See our <a href="/sms-consent" style={{ color: '#E8603C' }}>SMS Consent &amp; Opt-In</a> page for full details on our SMS practices.
          </p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>4. MLS Data</h2>
          <p>Rental listing data sourced from the MLS (Multiple Listing Service) is displayed under an IDX data exchange agreement with the Southeast Florida MLS. This data is provided for consumers&apos; personal, non-commercial use and may not be used for any purpose other than identifying prospective properties consumers may be interested in leasing.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>5. Data Security</h2>
          <p>We use industry-standard security measures including encrypted data transmission (TLS), secure token storage, row-level security on our database, and input sanitization. Payment information is processed by Stripe and never stored on our servers.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>6. Your Rights</h2>
          <p>You may:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Access and update your personal information through the app</li>
            <li>Delete your account by contacting us</li>
            <li>Opt out of marketing communications at any time</li>
            <li>Request a copy of your data</li>
          </ul>
          <p style={{ marginTop: '12px' }}>California residents have additional rights under the CCPA. Contact us at <strong>privacy@padmagnet.com</strong> to exercise these rights.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>7. Cookies &amp; Analytics</h2>
          <p>Our website uses essential cookies for functionality. We do not use third-party tracking or advertising cookies.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>8. Children&apos;s Privacy</h2>
          <p>PadMagnet is not intended for users under 18. We do not knowingly collect information from children.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>9. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify users of material changes via email or in-app notification.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>10. Contact Us</h2>
          <p>If you have questions about this privacy policy, contact us at:</p>
          <p style={{ marginTop: '8px' }}>
            <strong>PadMagnet LLC</strong><br />
            Email: privacy@padmagnet.com<br />
            Support: support@padmagnet.com
          </p>
        </div>
      </div>
    </div>
  );
}
