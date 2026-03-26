export const metadata = {
  title: 'SMS Consent & Opt-In — PadMagnet',
  description: 'How PadMagnet collects SMS consent from users. TCPA-compliant opt-in process for transactional text message notifications.',
};

export default function SmsConsentPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1e293b',
    }}>
      {/* Header */}
      <div style={{
        background: '#0a0e17',
        padding: '20px 0',
        borderBottom: '3px solid #F95E0C',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo/padmagnet-icon-120.png" alt="PadMagnet" width={36} height={36} style={{ borderRadius: 8 }} />
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Pad</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#F95E0C' }}>Magnet</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0a0e17', marginBottom: 8 }}>
          SMS Consent & Opt-In Process
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', marginBottom: 40, lineHeight: 1.6 }}>
          PadMagnet collects explicit, informed consent from users before sending any SMS text messages.
          This page documents our TCPA-compliant opt-in process for A2P 10DLC compliance.
        </p>

        {/* Section 1: Overview */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 32,
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0e17', marginBottom: 16 }}>
            1. How Users Opt In to SMS Notifications
          </h2>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
            SMS consent is collected <strong>exclusively within the PadMagnet mobile application</strong> through
            the Notification Settings screen. Users must take an affirmative action — manually toggling on
            "SMS Notifications" — before any text messages are sent. SMS is <strong>never enabled by default</strong>.
          </p>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7 }}>
            Consent is collected separately from account registration. Users can fully use PadMagnet
            without enabling SMS. SMS consent is not a condition of purchase or use of the app.
          </p>
        </div>

        {/* Section 2: In-App Flow with Mockup */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 32,
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0e17', marginBottom: 16 }}>
            2. In-App Opt-In Screen
          </h2>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 24 }}>
            The following shows the exact opt-in flow within the PadMagnet mobile app:
          </p>

          {/* Phone Mockup */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Step 1: Before toggle */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 1: SMS is OFF by default
              </div>
              <div style={{
                width: 280, background: '#0f1724', borderRadius: 24, padding: '16px 0',
                border: '2px solid #334155', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}>
                {/* Status bar */}
                <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                  <span>9:41</span>
                  <span>● ● ●</span>
                </div>
                {/* Screen title */}
                <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Notification Settings</div>
                </div>
                {/* Toggle row */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>SMS Notifications</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Receive text message notifications</div>
                    </div>
                    {/* Toggle OFF */}
                    <div style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: '#334155', position: 'relative',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 10,
                        background: '#fff', position: 'absolute',
                        top: 2, left: 2,
                      }} />
                    </div>
                  </div>
                </div>
                {/* Disclosure NOT visible yet */}
                <div style={{ padding: '16px 20px', minHeight: 100 }}>
                  <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 20 }}>
                    Toggle SMS to see disclosure
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 32, color: '#94a3b8' }}>→</div>

            {/* Step 2: After toggle with disclosure */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 2: User toggles ON, sees disclosure
              </div>
              <div style={{
                width: 280, background: '#0f1724', borderRadius: 24, padding: '16px 0',
                border: '2px solid #3b82f6', boxShadow: '0 8px 24px rgba(59,130,246,0.15)',
              }}>
                {/* Status bar */}
                <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                  <span>9:41</span>
                  <span>● ● ●</span>
                </div>
                {/* Screen title */}
                <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Notification Settings</div>
                </div>
                {/* Toggle row - ON */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>SMS Notifications</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Receive text message notifications</div>
                    </div>
                    {/* Toggle ON */}
                    <div style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: '#3b82f6', position: 'relative',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 10,
                        background: '#fff', position: 'absolute',
                        top: 2, left: 22,
                      }} />
                    </div>
                  </div>
                </div>
                {/* TCPA Disclosure */}
                <div style={{ padding: '12px 20px', background: '#1e293b22', margin: '12px 12px', borderRadius: 8, border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                    By enabling SMS, you consent to receive transactional text message notifications from
                    PadMagnet (e.g., inquiry alerts, listing reminders, message notifications). Consent is
                    not a condition of purchase or use of the app. Msg & data rates may apply. Msg frequency
                    varies based on account activity, typically 1-5 per week. Reply STOP to unsubscribe at
                    any time.
                  </div>
                  <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 6 }}>
                    Privacy Policy · Terms of Service
                  </div>
                </div>
                {/* Phone input */}
                <div style={{ padding: '8px 20px' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Phone Number</div>
                  <div style={{
                    background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                    padding: '10px 12px', fontSize: 14, color: '#fff',
                  }}>
                    (772) 555-0123
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: TCPA Disclosure Text */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 32,
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0e17', marginBottom: 16 }}>
            3. TCPA Disclosure Text (Exact)
          </h2>
          <div style={{
            background: '#f1f5f9', borderRadius: 8, padding: 20,
            border: '1px solid #e2e8f0', fontSize: 14, color: '#334155',
            lineHeight: 1.7, fontStyle: 'italic',
          }}>
            "By enabling SMS, you consent to receive transactional text message notifications from
            PadMagnet (e.g., inquiry alerts, listing reminders, message notifications). Consent is
            not a condition of purchase or use of the app. Msg & data rates may apply. Msg frequency
            varies based on account activity, typically 1-5 per week. Reply STOP to unsubscribe at
            any time."
          </div>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>
            The disclosure includes links to our <a href="/privacy" style={{ color: '#3b82f6' }}>Privacy Policy</a> and{' '}
            <a href="/terms" style={{ color: '#3b82f6' }}>Terms of Service</a> (Section 7: SMS Terms).
          </p>
        </div>

        {/* Section 4: Message Types */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 32,
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0e17', marginBottom: 16 }}>
            4. Types of SMS Messages Sent
          </h2>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
            PadMagnet sends only <strong>transactional SMS notifications</strong> related to user activity.
            No marketing or promotional messages are sent via SMS.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Message Type</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Recipient</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Example</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['New inquiry alert', 'Property Owner', '"PadMagnet: A tenant is interested in your listing at 1234 SE Magnolia Ave. Open the app to view their message."'],
                ['Listing expiry reminder', 'Property Owner', '"PadMagnet: Your listing at 1234 SE Magnolia Ave expires in 3 days. Renew your pass to stay visible. Reply STOP to opt out."'],
                ['New message notification', 'Tenant', '"PadMagnet: You have a new message from a property owner about 8075 SE Palm St. Open PadMagnet to read it."'],
                ['Listing activation', 'Property Owner', '"PadMagnet: Your listing is now live! Tenants in your area can see 1234 SE Magnolia Ave. Manage it anytime in the app."'],
                ['Delivery confirmation', 'Both', '"PadMagnet: Your message to the property owner was delivered. You\'ll be notified when they reply. Reply STOP to opt out."'],
              ].map(([type, recipient, example], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1e293b' }}>{type}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{recipient}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 13 }}>{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 5: Opt-Out */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 32,
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0e17', marginBottom: 16 }}>
            5. How Users Opt Out
          </h2>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
            Users can opt out of SMS notifications at any time through multiple methods:
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { title: 'Reply STOP', desc: 'Text STOP to the PadMagnet number. Immediate unsubscribe. Confirmation message sent.' },
              { title: 'In-App Toggle', desc: 'Toggle off "SMS Notifications" in the app\'s Notification Settings screen.' },
              { title: 'Additional Keywords', desc: 'OPTOUT, CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, STOPALL — all honored immediately.' },
            ].map((method, i) => (
              <div key={i} style={{
                flex: '1 1 200px', background: '#f1f5f9', borderRadius: 8,
                padding: 16, border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0e17', marginBottom: 4 }}>{method.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{method.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Compliance Details */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 32,
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0e17', marginBottom: 16 }}>
            6. Compliance Summary
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['Sender Identity', 'PadMagnet LLC'],
                ['Phone Number', '(253) 600-3665'],
                ['Caller ID', 'PadMagnet'],
                ['Message Prefix', 'All messages begin with "PadMagnet:"'],
                ['Message Type', 'Transactional only (no marketing)'],
                ['Frequency', '1-5 messages per week based on account activity'],
                ['Opt-In Method', 'In-app toggle with TCPA disclosure (explicit consent)'],
                ['Opt-Out Methods', 'Reply STOP, in-app toggle, or any standard opt-out keyword'],
                ['HELP Response', '"Reply STOP to unsubscribe. Msg & Data Rates May Apply."'],
                ['Privacy Policy', 'padmagnet.com/privacy'],
                ['Terms of Service', 'padmagnet.com/terms (Section 7: SMS Terms)'],
              ].map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#475569', width: '30%' }}>{label}</td>
                  <td style={{ padding: '10px 14px', color: '#1e293b' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0 40px', color: '#94a3b8', fontSize: 13 }}>
          <p>© 2026 PadMagnet LLC. All rights reserved.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/privacy" style={{ color: '#3b82f6', textDecoration: 'none' }}>Privacy Policy</a>
            {' · '}
            <a href="/terms" style={{ color: '#3b82f6', textDecoration: 'none' }}>Terms of Service</a>
            {' · '}
            <a href="mailto:support@padmagnet.com" style={{ color: '#3b82f6', textDecoration: 'none' }}>support@padmagnet.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
