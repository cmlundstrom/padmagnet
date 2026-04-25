-- 075: Repoint listing_admin_edited and listing_revision_requested CTAs
--      from the bare padmagnet.com homepage to the real listing URL.
--
-- The two templates I shipped in migration 074 used a hardcoded
-- href="https://padmagnet.com" CTA, which dropped users on the marketing
-- landing page instead of the listing they were notified about. Every
-- other email template already follows the correct pattern of using a
-- {{variable_url}} populated server-side at send time. This migration
-- realigns the two outliers + adds listing_url to their variable list.
--
-- Also takes the opportunity to soften the CTA labels: "View My Listing"
-- becomes "Open My Listing" because on a real Universal Link tap the
-- mobile app opens to the listing detail screen (read-only); the
-- "Open" verb works for both desktop browser and mobile app.

UPDATE email_templates
SET
  body_html =
    '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">'
    || '<div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">'
    || '<h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1></div>'
    || '<div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">'
    || '<h2 style="color:#0F2B46;margin:0 0 16px">Quick Revisions Needed</h2>'
    || '<p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>'
    || '<p style="color:#444;line-height:1.6">We took a look at your listing at <strong>{{listing_address}}</strong> and it needs a small change before it can go live.</p>'
    || '<div style="background:#fff8e6;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0">'
    || '<p style="color:#333;margin:0 0 8px;line-height:1.6"><strong>Reason:</strong> {{review_reason}}</p>'
    || '<p style="color:#333;margin:0;line-height:1.6">{{review_note}}</p>'
    || '</div>'
    || '<p style="color:#444;line-height:1.6">Open the PadMagnet app, tap <strong>Listings → Continue</strong> on this property, fix the item above, and tap <strong>Publish</strong> to resubmit. We''ll get you live as soon as possible.</p>'
    || '<p style="text-align:center;margin:24px 0">'
    || '<a href="{{listing_url}}" style="display:inline-block;background:linear-gradient(135deg,#F97316,#E8603C,#DC5A2C);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:16px">Open My Listing</a>'
    || '</p>'
    || '<p style="color:#999;font-size:11px;text-align:center;margin-top:-12px">Tap on your phone to open in the PadMagnet app, or view in any browser.</p>'
    || '<hr style="border:none;border-top:1px solid #eee;margin:24px 0">'
    || '<p style="color:#999;font-size:12px;text-align:center">Questions? Reply to this email or contact <a href="mailto:support@padmagnet.com" style="color:#4A90D9">support@padmagnet.com</a>.<br>🧲 PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>'
    || '</div></div>',
  variables = '["owner_name","listing_address","review_reason","review_note","listing_url"]'::jsonb
WHERE slug = 'listing_revision_requested';

UPDATE email_templates
SET
  body_html =
    '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">'
    || '<div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">'
    || '<h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1></div>'
    || '<div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">'
    || '<h2 style="color:#0F2B46;margin:0 0 16px">Your Listing is Live</h2>'
    || '<p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>'
    || '<p style="color:#444;line-height:1.6">Your listing at <strong>{{listing_address}}</strong> is <strong style="color:#22C55E">live on PadMagnet</strong>. Our review team made a quick polish pass and approved it for you so renters can start finding it right now.</p>'
    || '<div style="background:#f0f7ff;border-radius:8px;padding:16px 20px;margin:20px 0">'
    || '<p style="color:#333;margin:0;line-height:1.6"><strong>What we adjusted:</strong> {{edit_note}}</p>'
    || '</div>'
    || '<p style="color:#444;line-height:1.6">Open the listing below to see the final version. If anything looks off, open the PadMagnet app and tap <strong>Listings → Edit Listing</strong> to make changes — we''ll re-review.</p>'
    || '<p style="text-align:center;margin:24px 0">'
    || '<a href="{{listing_url}}" style="display:inline-block;background:linear-gradient(135deg,#F97316,#E8603C,#DC5A2C);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:16px">Open My Listing</a>'
    || '</p>'
    || '<p style="color:#999;font-size:11px;text-align:center;margin-top:-12px">Tap on your phone to open in the PadMagnet app, or view in any browser.</p>'
    || '<hr style="border:none;border-top:1px solid #eee;margin:24px 0">'
    || '<p style="color:#999;font-size:12px;text-align:center">Questions? Reply to this email or contact <a href="mailto:support@padmagnet.com" style="color:#4A90D9">support@padmagnet.com</a>.<br>🧲 PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>'
    || '</div></div>',
  variables = '["owner_name","listing_address","edit_note","listing_url"]'::jsonb
WHERE slug = 'listing_admin_edited';
