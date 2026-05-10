-- Migration 082: Admin notification email templates — global alert-bar pattern
--
-- Codifies the shared visual language for ALL admin-facing emails. Every
-- admin email follows this skeleton (consistency replaces literal template
-- inheritance, since each row stores full HTML for admin-editability):
--
--   1. Canonical PadMagnet header (navy + orange wordmark)
--   2. COLORED ALERT BAR — instant visual differentiator for admin recipients
--      Bar variants:
--        Yellow (#F59E0B)  → Warning / flag / report          (e.g., "USER FLAGS PROBLEM LISTING")
--        Green  (#16A34A)  → New approval / pending positive  (e.g., "NEW USER SEEKS LISTING APPROVAL")
--        Red    (#DC2626)  → Critical / immediate action      (e.g., abuse, urgent moderation)
--   3. Admin details card (table of variables)
--   4. Free-text block (optional, passed as pre-rendered HTML)
--   5. CTA button to admin queue / action link
--   6. Canonical footer
--
-- This migration seeds: admin_content_report_flag (yellow bar — Google Play
-- UGC Policy compliance signal that fires on every POST /api/reports).
--
-- Future admin templates (admin_listing_pending_review with green bar,
-- admin_user_abuse_alert with red bar, etc.) follow the same skeleton.
--
-- Created 2026-05-09 alongside the v1.0.1 UGC moderation rollout.

INSERT INTO email_templates (slug, subject, body_html, variables, is_active)
VALUES (
  'admin_content_report_flag',
  '🧲 [ADMIN] User flagged a {{content_type}} — review required',
  '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">'
  -- ── 1. Canonical PadMagnet header ────────────────────────────────
  || '<div style="background:#0B1D3A;padding:20px 24px;text-align:center">'
  || '<img src="https://padmagnet.com/logo/PM_LOGO_180px180p.png" alt="PadMagnet" width="36" height="36" style="vertical-align:middle;margin-right:10px;border-radius:6px">'
  || '<span style="font-size:22px;font-weight:bold;color:#ffffff;vertical-align:middle">Pad</span>'
  || '<span style="font-size:22px;font-weight:bold;color:#F95E0C;vertical-align:middle">Magnet</span>'
  || '</div>'
  -- ── 2. ADMIN ALERT BAR — yellow (warning/flag) ───────────────────
  || '<div style="background:#F59E0B;color:#ffffff;padding:14px 24px;text-align:center;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase">'
  || '⚠ USER FLAGS PROBLEM {{content_type_label}}'
  || '</div>'
  -- ── 3. Body ──────────────────────────────────────────────────────
  || '<div style="padding:24px">'
  || '<h2 style="color:#0F2B46;margin:0 0 8px;font-size:20px">Content Report Submitted</h2>'
  || '<p style="color:#666;line-height:1.6;margin:0 0 20px;font-size:14px">A user has flagged content as inappropriate. Review the details below and take action via the admin reports queue.</p>'
  -- Admin details card
  || '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 16px">'
  || '<p style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px">Report Details</p>'
  || '<table style="width:100%;border-collapse:collapse;font-size:14px;color:#1a1a1a">'
  || '<tr><td style="padding:5px 0;color:#64748b;width:120px;vertical-align:top">Report ID</td><td style="padding:5px 0;font-family:monospace;font-size:12px;word-break:break-all">{{report_id}}</td></tr>'
  || '<tr><td style="padding:5px 0;color:#64748b;vertical-align:top">Content type</td><td style="padding:5px 0"><strong>{{content_type}}</strong></td></tr>'
  || '<tr><td style="padding:5px 0;color:#64748b;vertical-align:top">Content ID</td><td style="padding:5px 0;font-family:monospace;font-size:12px;word-break:break-all">{{content_id}}</td></tr>'
  || '<tr><td style="padding:5px 0;color:#64748b;vertical-align:top">Reason</td><td style="padding:5px 0"><strong style="color:#B45309">{{reason_code}}</strong></td></tr>'
  || '<tr><td style="padding:5px 0;color:#64748b;vertical-align:top">Reporter</td><td style="padding:5px 0">{{reporter_email}}</td></tr>'
  || '<tr><td style="padding:5px 0;color:#64748b;vertical-align:top">Submitted</td><td style="padding:5px 0">{{created_at}}</td></tr>'
  || '</table>'
  || '</div>'
  -- Free text block (pre-rendered HTML or empty string)
  || '{{free_text_block}}'
  -- CTA
  || '<p style="text-align:center;margin:24px 0 8px">'
  || '<a href="{{admin_url}}" style="display:inline-block;background:#0F2B46;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.5px">Open Admin Reports Queue</a>'
  || '</p>'
  || '<p style="text-align:center;color:#94a3b8;font-size:12px;margin:8px 0 0">Quick actions: dismiss · warn user · hide content · ban user · escalate</p>'
  || '</div>'
  -- ── 4. Canonical footer ──────────────────────────────────────────
  || '<div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 24px;text-align:center">'
  || '<p style="font-size:13px;color:#64748b;margin:0 0 8px"><strong>The PadMagnet Team</strong></p>'
  || '<p style="font-size:12px;color:#94a3b8;margin:0">'
  || '<a href="https://padmagnet.com" style="color:#3B82F6;text-decoration:none">padmagnet.com</a>'
  || ' &middot; A Rental Matching Platform, Hyperlocal by Design'
  || '</p>'
  || '<p style="font-size:11px;color:#cbd5e1;margin:8px 0 0">&copy; 2026 PadMagnet LLC. All rights reserved.</p>'
  || '</div>'
  || '</div>',
  '["report_id","content_type","content_type_label","content_id","reason_code","reporter_email","created_at","free_text_block","admin_url"]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject    = EXCLUDED.subject,
  body_html  = EXCLUDED.body_html,
  variables  = EXCLUDED.variables,
  is_active  = true;
