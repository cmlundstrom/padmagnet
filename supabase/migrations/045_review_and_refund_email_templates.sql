-- Email templates for listing review flow + refunds

INSERT INTO email_templates (slug, subject, body, variables, is_active) VALUES
(
  'listing_submitted',
  'Your listing has been submitted — {{confirmation_code}}',
  '<h2>Listing Submitted for Review</h2><p>Hi {{owner_name}},</p><p>Your listing at <strong>{{listing_address}}</strong> has been submitted and will appear in PadMagnet''s LIVE feed after a brief compliance review — generally much less than 24 hours.</p><p><strong>Details:</strong></p><ul><li>Confirmation Code: {{confirmation_code}}</li><li>Rent: {{rent}}</li><li>Type: {{property_type}}</li><li>Beds/Baths: {{beds_baths}}</li><li>Photos: {{photo_count}}</li></ul><p>We''ll email you as soon as your listing is approved and live.</p><p>— The PadMagnet Team</p>',
  '["owner_name","confirmation_code","listing_address","rent","property_type","beds_baths","photo_count"]',
  true
),
(
  'listing_approved',
  'Your listing is LIVE! — {{confirmation_code}}',
  '<h2>🎉 Your Listing is Live!</h2><p>Hi {{owner_name}},</p><p>Great news — your listing at <strong>{{listing_address}}</strong> has passed our compliance review and is now live in the PadMagnet feed!</p><p>Confirmation Code: <strong>{{confirmation_code}}</strong></p><p>Your listing will be visible to renters for 30 days. We''ll send you a reminder before it expires.</p><p>— The PadMagnet Team</p>',
  '["owner_name","confirmation_code","listing_address"]',
  true
),
(
  'listing_rejected',
  'Your listing needs changes — {{listing_address}}',
  '<h2>Listing Review Update</h2><p>Hi {{owner_name}},</p><p>We reviewed your listing at <strong>{{listing_address}}</strong> and it needs some changes before we can make it live.</p><p><strong>Reason:</strong> {{rejection_reason}}</p><p>Please update your listing in the app and resubmit. If you have questions, contact us at support@padmagnet.com.</p><p>— The PadMagnet Team</p>',
  '["owner_name","listing_address","rejection_reason"]',
  true
),
(
  'refund_confirmation',
  'Your PadMagnet refund has been processed',
  '<h2>Refund Confirmation</h2><p>Hi {{owner_name}},</p><p>We''ve processed a refund of <strong>{{amount}}</strong> for your listing at <strong>{{listing_address}}</strong>.</p><p><strong>Reason:</strong> {{reason}}</p><p><strong>Date:</strong> {{refund_date}}</p><p>The refund should appear on your statement within 5-10 business days depending on your bank.</p><p>If you have questions, contact us at support@padmagnet.com.</p><p>— The PadMagnet Team</p>',
  '["owner_name","amount","listing_address","reason","refund_date"]',
  true
),
(
  'system_alert',
  '[PadMagnet] System Alert — {{alert_type}}',
  '<h2>⚠️ System Alert</h2><p><strong>Alert Type:</strong> {{alert_type}}</p><p><strong>Details:</strong> {{details}}</p><p><strong>Time:</strong> {{timestamp}}</p><hr/><p style="font-size:12px;color:#94a3b8;">This is an automated alert from the PadMagnet admin system. Manage alert settings at padmagnet.com/admin > System Health.</p>',
  '["alert_type","details","timestamp"]',
  true
)
ON CONFLICT (slug) DO NOTHING;
