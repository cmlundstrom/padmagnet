-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 039: Add HTML bodies to email templates             ║
-- ║  7 templates from migration 012 were seeded without HTML.      ║
-- ║  Also adds push notification template to message_templates.    ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- payment_confirmation
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#0F2B46;margin:0 0 16px">Your Listing is Live!</h2>
    <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
    <p style="color:#444;line-height:1.6">Your payment has been received and your listing at <strong>{{listing_address}}</strong> is now active on PadMagnet.</p>
    <div style="background:#f0f7ff;border-radius:8px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#666;width:140px">Address</td><td style="padding:6px 0;color:#333">{{listing_address}}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Expires</td><td style="padding:6px 0;color:#333">{{expires_at}}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="{{receipt_url}}" style="background:#4A90D9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">View Receipt</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'payment_confirmation';

-- expiry_7day
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#0F2B46;margin:0 0 16px">Your Listing Expires in 7 Days</h2>
    <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
    <p style="color:#444;line-height:1.6">Your listing at <strong>{{listing_address}}</strong> will expire on <strong>{{expires_at}}</strong>.</p>
    <p style="color:#444;line-height:1.6">Renew now to keep your listing visible to tenants searching for their next home.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{renew_url}}" style="background:#F59E0B;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Renew Listing</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'expiry_7day';

-- expiry_3day
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#e67e22;margin:0 0 16px">Your Listing Expires in 3 Days</h2>
    <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
    <p style="color:#444;line-height:1.6">Your listing at <strong>{{listing_address}}</strong> will expire on <strong>{{expires_at}}</strong>. Once expired, tenants will no longer see it in search results.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{renew_url}}" style="background:#F59E0B;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Renew Now</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'expiry_3day';

-- expiry_1day
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#e74c3c;margin:0 0 16px">Last Day! Your Listing Expires Tomorrow</h2>
    <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
    <p style="color:#444;line-height:1.6">This is your final reminder — your listing at <strong>{{listing_address}}</strong> expires <strong>tomorrow</strong>.</p>
    <p style="color:#444;line-height:1.6">After expiry, your listing will be removed from search results and tenant feeds.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{renew_url}}" style="background:#e74c3c;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Renew Before It Expires</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'expiry_1day';

-- listing_expired
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#0F2B46;margin:0 0 16px">Your Listing Has Expired</h2>
    <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
    <p style="color:#444;line-height:1.6">Your listing at <strong>{{listing_address}}</strong> has expired and is no longer visible to tenants.</p>
    <p style="color:#444;line-height:1.6">If your property is still available, you can renew your listing to get it back in front of renters.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{renew_url}}" style="background:#F59E0B;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Renew Listing</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'listing_expired';

-- inquiry_alert
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#0F2B46;margin:0 0 16px">New Inquiry on Your Listing</h2>
    <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
    <p style="color:#444;line-height:1.6"><strong>{{tenant_name}}</strong> is interested in your listing at <strong>{{listing_address}}</strong>:</p>
    <blockquote style="background:#f0f7ff;border-left:4px solid #4A90D9;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;color:#333;line-height:1.5">{{message_preview}}</blockquote>
    <div style="text-align:center;margin:28px 0">
      <a href="{{inbox_url}}" style="background:#4A90D9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">View in Inbox</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'inquiry_alert';

-- receipt
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#0F2B46;margin:0 0 16px">Payment Receipt</h2>
    <p style="color:#444;line-height:1.6">Hi {{owner_name}},</p>
    <p style="color:#444;line-height:1.6">Thank you for your payment. Here are your receipt details:</p>
    <div style="background:#f0f7ff;border-radius:8px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#666;width:140px">Amount</td><td style="padding:6px 0;color:#0F2B46;font-weight:600;font-size:18px">{{amount}}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Description</td><td style="padding:6px 0;color:#333">{{description}}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Date</td><td style="padding:6px 0;color:#333">{{date}}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="{{receipt_url}}" style="background:#4A90D9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">View Full Receipt</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'receipt';

-- showing_confirmed
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#0F2B46;margin:0 0 16px">Tour Confirmed!</h2>
    <p style="color:#444;line-height:1.6">Hi {{tenant_name}},</p>
    <p style="color:#444;line-height:1.6">Your tour has been confirmed for the property at <strong>{{listing_address}}</strong>.</p>
    <div style="background:#f0f7ff;border-radius:8px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#666;width:140px">Property</td><td style="padding:6px 0;color:#333">{{listing_address}}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Date & Time</td><td style="padding:6px 0;color:#0F2B46;font-weight:600">{{date_time}}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Owner</td><td style="padding:6px 0;color:#333">{{owner_name}}</td></tr>
      </table>
    </div>
    <p style="color:#444;line-height:1.6">Please arrive on time. If you need to reschedule, message the owner through the app.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'showing_confirmed';

-- document_sent
UPDATE email_templates SET body_html =
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa">
  <div style="background:#0F2B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🧲 PadMagnet</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px">
    <h2 style="color:#0F2B46;margin:0 0 16px">New Document From Your Landlord</h2>
    <p style="color:#444;line-height:1.6">Hi {{tenant_name}},</p>
    <p style="color:#444;line-height:1.6">A new document has been shared with you for the property at <strong>{{listing_address}}</strong>:</p>
    <div style="background:#f0f7ff;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
      <p style="margin:0;font-weight:600;color:#0F2B46;font-size:16px">{{document_name}}</p>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="{{view_url}}" style="background:#4A90D9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">View Document</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#999;font-size:12px;text-align:center">PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>
  </div>
</div>'
WHERE slug = 'document_sent';

-- ============================================================
-- Add push notification template to message_templates
-- Must alter constraint BEFORE inserting push channel row
-- ============================================================
ALTER TABLE message_templates DROP CONSTRAINT IF EXISTS message_templates_channel_check;
ALTER TABLE message_templates ADD CONSTRAINT message_templates_channel_check
  CHECK (channel IN ('sms', 'email', 'push'));

INSERT INTO message_templates (slug, channel, subject, body, variables) VALUES
  ('new_message_push', 'push', 'Message from {{sender_name}}',
   '{{message_preview}}',
   '{sender_name, message_preview, conversation_id}')
ON CONFLICT (slug) DO NOTHING;
