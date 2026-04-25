-- 074: Admin listing-approval workflow
--
-- 1. Adds admin review tracking columns to `listings` so the Send-Back flow
--    can persist the reason + freeform note for the owner to see in the
--    Listing Studio revision banner.
-- 2. Seeds two new email templates:
--      - listing_revision_requested  (sent on admin Send Back)
--      - listing_admin_edited        (sent when admin edits + auto-approves)
--
-- The existing `listing_approved` and `listing_rejected` templates
-- (migration 058) cover the Approve and hard-Reject paths and are reused.
-- Both new template subjects start with the magnet emoji 🧲 per the
-- global subject-line rule.

-- ── Schema additions ──────────────────────────────────────────────────

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS admin_review_reason text,
  ADD COLUMN IF NOT EXISTS admin_review_note text,
  ADD COLUMN IF NOT EXISTS admin_reviewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN listings.admin_review_reason IS
  'Canned reason from admin Send-Back modal (e.g. photos_quality, address_invalid). NULL when no revisions outstanding.';
COMMENT ON COLUMN listings.admin_review_note IS
  'Freeform admin note shown to owner in the Listing Studio revision banner. Cleared on next owner save.';
COMMENT ON COLUMN listings.admin_reviewed_at IS
  'Timestamp of the last admin approve / send-back / edit-and-approve action.';
COMMENT ON COLUMN listings.admin_reviewed_by IS
  'Admin profile id that performed the last review action. SET NULL on admin profile delete.';

-- ── New email templates ───────────────────────────────────────────────

-- 1) Send Back to owner with revision request
INSERT INTO email_templates (slug, subject, body_html, variables, is_active)
VALUES (
  'listing_revision_requested',
  '🧲 Action needed: revisions requested for {{listing_address}}',
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
  || '<a href="https://padmagnet.com" style="display:inline-block;background:linear-gradient(135deg,#F97316,#E8603C,#DC5A2C);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:16px">Open PadMagnet</a>'
  || '</p>'
  || '<hr style="border:none;border-top:1px solid #eee;margin:24px 0">'
  || '<p style="color:#999;font-size:12px;text-align:center">Questions? Reply to this email or contact <a href="mailto:support@padmagnet.com" style="color:#4A90D9">support@padmagnet.com</a>.<br>🧲 PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>'
  || '</div></div>',
  '["owner_name","listing_address","review_reason","review_note"]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject    = EXCLUDED.subject,
  body_html  = EXCLUDED.body_html,
  variables  = EXCLUDED.variables,
  is_active  = true;

-- 2) Admin edited + auto-approved (touched up small thing without bouncing)
INSERT INTO email_templates (slug, subject, body_html, variables, is_active)
VALUES (
  'listing_admin_edited',
  '🧲 Your listing was polished and approved by PadMagnet',
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
  || '<p style="color:#444;line-height:1.6">You can review the final version any time in <strong>Listings → View Listing</strong>. If anything looks off, tap <strong>Edit Listing</strong> and resubmit — we''ll re-review.</p>'
  || '<p style="text-align:center;margin:24px 0">'
  || '<a href="https://padmagnet.com" style="display:inline-block;background:linear-gradient(135deg,#F97316,#E8603C,#DC5A2C);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:16px">View My Listing</a>'
  || '</p>'
  || '<hr style="border:none;border-top:1px solid #eee;margin:24px 0">'
  || '<p style="color:#999;font-size:12px;text-align:center">Questions? Reply to this email or contact <a href="mailto:support@padmagnet.com" style="color:#4A90D9">support@padmagnet.com</a>.<br>🧲 PadMagnet.com — Your perfect rental match awaits!<br>&copy; PadMagnet LLC</p>'
  || '</div></div>',
  '["owner_name","listing_address","edit_note"]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject    = EXCLUDED.subject,
  body_html  = EXCLUDED.body_html,
  variables  = EXCLUDED.variables,
  is_active  = true;
