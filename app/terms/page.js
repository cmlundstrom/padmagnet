export const metadata = {
  title: 'Terms of Service — PadMagnet',
  description: 'PadMagnet terms of service. Rules and guidelines for using the PadMagnet platform.',
};

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p style={{ color: '#B0BEC5', fontSize: '14px', marginBottom: '32px' }}>
          Last updated: March 22, 2026
        </p>

        <div style={{ color: '#B0BEC5', fontSize: '15px', lineHeight: '1.7' }}>
          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
          <p>By accessing or using PadMagnet (&quot;the Service&quot;), provided by PadMagnet LLC (&quot;we,&quot; &quot;us&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>2. Description of Service</h2>
          <p>PadMagnet is a rental matching platform that connects tenants with rental properties in South Florida. We display listings sourced from the MLS (via IDX data exchange) and from property owners who list directly on our platform. PadScore™ is our proprietary matching algorithm that scores listings based on tenant preferences.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>3. Eligibility</h2>
          <p>You must be at least 18 years old to use PadMagnet. By creating an account, you represent that you are at least 18 and that the information you provide is accurate.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>4. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>5. Property Owners</h2>
          <p>Property owners who list on PadMagnet represent that:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>They have the legal right to lease the property</li>
            <li>Listing information is accurate and current</li>
            <li>Photos are of the actual property</li>
            <li>They will comply with all applicable fair housing laws</li>
            <li>They will respond to tenant inquiries in good faith</li>
          </ul>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>6. Payments &amp; Passes</h2>
          <p>Owner tier passes (Pro, Premium) are one-time purchases valid for 30 days. Payments are processed by Stripe. All sales are final — passes cannot be refunded once activated. If you upgrade mid-pass, unused time on your current pass is credited toward the new purchase.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>7. SMS / Text Messaging Terms</h2>
          <p>PadMagnet offers optional SMS text message notifications for account activity including new tenant inquiries, listing confirmations, listing expiry reminders, and message delivery alerts. For a complete description of our SMS consent process, including the in-app opt-in flow and all message types, visit our <a href="/sms-consent" style={{ color: '#E8603C' }}>SMS Consent &amp; Opt-In</a> page.</p>

          <p style={{ marginTop: '12px' }}><strong style={{ color: '#FFFFFF' }}>Opt-In:</strong> You must explicitly opt in to receive SMS messages by enabling &quot;SMS Notifications&quot; in the PadMagnet app&apos;s Notification Settings. Your consent to receive SMS is not a condition of purchase or use of the PadMagnet platform. By opting in, you consent to receive transactional text messages from PadMagnet at the phone number associated with your account.</p>

          <p style={{ marginTop: '12px' }}><strong style={{ color: '#FFFFFF' }}>Message Frequency:</strong> Message frequency varies based on your account activity, typically 1–5 messages per week.</p>

          <p style={{ marginTop: '12px' }}><strong style={{ color: '#FFFFFF' }}>Fees:</strong> Message and data rates may apply. PadMagnet does not charge for SMS, but your mobile carrier may apply standard messaging fees.</p>

          <p style={{ marginTop: '12px' }}><strong style={{ color: '#FFFFFF' }}>Opt-Out:</strong> <span style={{ fontWeight: 700, color: '#FFFFFF' }}>You may opt out of SMS at any time by replying STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, or QUIT to any PadMagnet message.</span> You will receive one final confirmation message and no further texts will be sent. You may also disable SMS in the app&apos;s Notification Settings.</p>

          <p style={{ marginTop: '12px' }}><strong style={{ color: '#FFFFFF' }}>Help:</strong> Reply HELP to any PadMagnet message for support, or contact us at support@padmagnet.com.</p>

          <p style={{ marginTop: '12px' }}><strong style={{ color: '#FFFFFF' }}>Phone Number Linking:</strong> Your phone number is linked to your PadMagnet user account to route notifications. We do not share, sell, or transfer your phone number or messaging consent to third parties.</p>

          <p style={{ marginTop: '12px' }}>For details on how we handle your data, see our <a href="/privacy" style={{ color: '#3B82F6', textDecoration: 'none' }}>Privacy Policy</a>.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>8. MLS Data &amp; IDX Compliance</h2>
          <p>MLS listing data is provided under IDX agreement with the Southeast Florida MLS. This data is for personal, non-commercial use only. You may not:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Copy, redistribute, or scrape MLS data</li>
            <li>Use listing data for automated valuation or AI/ML training</li>
            <li>Create derivative works from MLS data</li>
            <li>Contact listing agents for purposes unrelated to the listed property</li>
          </ul>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>9. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Post false, misleading, or discriminatory listing information</li>
            <li>Harass other users through the messaging system</li>
            <li>Attempt to circumvent payment requirements</li>
            <li>Use the platform for any illegal purpose</li>
            <li>Interfere with the operation of the Service</li>
            <li>Create multiple accounts to abuse free tier limits</li>
          </ul>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>10. Disclaimers</h2>
          <p>PadMagnet is a listing and matching platform — we are not a real estate broker, property manager, or landlord. We do not:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Guarantee the accuracy of any listing information</li>
            <li>Verify the condition of properties</li>
            <li>Mediate disputes between tenants and owners</li>
            <li>Provide legal, financial, or real estate advice</li>
          </ul>
          <p style={{ marginTop: '12px' }}>THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>11. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, PadMagnet LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, rental disputes, or property-related losses.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>12. Intellectual Property</h2>
          <p>PadMagnet, PadScore, and all associated branding, design, and technology are the property of PadMagnet LLC. User-submitted content (photos, descriptions) remains the property of the submitter, with a license granted to PadMagnet to display it on the platform.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>13. Termination</h2>
          <p>We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the app or by contacting support.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>14. Governing Law</h2>
          <p>These terms are governed by the laws of the State of Florida. Any disputes shall be resolved in the courts of Martin County, Florida.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>15. Changes to Terms</h2>
          <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>

          <h2 style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: '20px', marginTop: '32px', marginBottom: '12px' }}>16. Contact</h2>
          <p>Questions about these terms? Contact us at:</p>
          <p style={{ marginTop: '8px' }}>
            <strong>PadMagnet LLC</strong><br />
            Email: legal@padmagnet.com<br />
            Support: support@padmagnet.com
          </p>
        </div>
      </div>
    </div>
  );
}
