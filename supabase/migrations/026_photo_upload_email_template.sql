-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 026: Photo upload link email template                ║
-- ║  Branded email sent when owner requests desktop photo upload    ║
-- ╚══════════════════════════════════════════════════════════════════╝

INSERT INTO email_templates (slug, subject, body_html, variables, is_active) VALUES
(
  'photo_upload_link',
  'Upload Photos to Your PadMagnet Listing',
  '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
    <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
      <h2 style="color:#0F2B46;margin:0 0 16px">Upload Your Photos</h2>
      <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
      <p style="color:#444;line-height:1.6">Click below to upload photos for your listing at <strong>{{listing_address}}</strong> from your computer or tablet.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="{{upload_url}}" style="background:#4A90D9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Upload Photos Now</a>
      </div>
      <p style="color:#888;font-size:13px">This link expires in 15 minutes. Drag and drop your photos or click to select — they''ll sync to your phone automatically.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
    </div>
  </div>',
  '["owner_name","listing_address","upload_url"]',
  true
)
ON CONFLICT (slug) DO NOTHING;
