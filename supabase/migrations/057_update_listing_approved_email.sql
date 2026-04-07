-- 057: Update listing_approved email template with richer content

UPDATE email_templates
SET
  subject = 'You''re Live! Your Listing is Active — {{confirmation_code}}',
  body_html = '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
<h2 style="color: #E8603C;">🎉 You''re Live!</h2>
<p>Hi {{owner_name}},</p>
<p>Your rental listing at <strong>{{listing_address}}</strong> is now <strong style="color: #22C55E;">active on PadMagnet</strong> and being shown to renters right now.</p>
<p style="font-size: 13px; color: #64748B;">Confirmation Code: <strong>{{confirmation_code}}</strong></p>
<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
<h3 style="color: #0B1D3A; font-size: 16px;">Need to make changes?</h3>
<p>Log in to the PadMagnet app, go to <strong>"Listings,"</strong> and select <strong>"Edit Listing."</strong></p>
<h3 style="color: #0B1D3A; font-size: 16px;">Found the perfect tenant?</h3>
<p>Stop new inquiries by logging in, going to <strong>"Listings,"</strong> and selecting <strong>"De-List."</strong> If a deal falls through, you can reactivate your listing at any time to restart your tenant lead flow.</p>
<h3 style="color: #0B1D3A; font-size: 16px;">Want more views on your listing?</h3>
<p>Consider upgrading to a <strong>Pro</strong> or <strong>Premium</strong> plan for 30 days (non-recurring).</p>
<p style="text-align: center; margin: 24px 0;">
<a href="https://padmagnet.com/plans" style="display: inline-block; background: linear-gradient(135deg, #F97316, #E8603C, #DC5A2C); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 16px;">Choose Your Plan</a>
</p>
<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
<p>Thanks for using PadMagnet — we''re excited to help you find your next tenant!</p>
<p style="font-size: 12px; color: #94a3b8;">Your listing will be visible to renters for 30 days. We''ll send you a reminder before it expires.</p>
<p style="font-size: 12px; color: #94a3b8;">© 2026 PadMagnet LLC</p>
</div>',
  variables = '["owner_name","confirmation_code","listing_address"]'
WHERE slug = 'listing_approved';
