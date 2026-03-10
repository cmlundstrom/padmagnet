-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 030: Listing confirmed email template               ║
-- ║  Sent to owner when listing is successfully submitted          ║
-- ╚══════════════════════════════════════════════════════════════════╝

INSERT INTO email_templates (slug, subject, body_html, variables, is_active) VALUES
(
  'listing_confirmed',
  'Your PadMagnet Listing is Live! ({{confirmation_code}})',
  '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
    <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
      <h2 style="color:#0F2B46;margin:0 0 16px">Your Listing is Live!</h2>
      <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
      <p style="color:#444;line-height:1.6">Your rental listing has been submitted and is now visible to tenants on PadMagnet.</p>
      <div style="background:#f0f7ff;border-radius:8px;padding:20px;margin:20px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:140px">Confirmation</td><td style="padding:6px 0;color:#0F2B46;font-weight:600;font-size:18px">{{confirmation_code}}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Address</td><td style="padding:6px 0;color:#333">{{listing_address}}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Monthly Rent</td><td style="padding:6px 0;color:#333">{{rent}}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Type</td><td style="padding:6px 0;color:#333">{{property_type}}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Beds / Baths</td><td style="padding:6px 0;color:#333">{{beds_baths}}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Photos</td><td style="padding:6px 0;color:#333">{{photo_count}}</td></tr>
        </table>
      </div>
      <p style="color:#444;line-height:1.6">Save your confirmation code <strong>{{confirmation_code}}</strong> for your records. You can edit your listing anytime from the PadMagnet app.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
    </div>
  </div>',
  '["owner_name","confirmation_code","listing_address","rent","property_type","beds_baths","photo_count"]',
  true
)
ON CONFLICT (slug) DO NOTHING;
