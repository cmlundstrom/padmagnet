-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 027: Quick Photo Upload Link product                 ║
-- ║  Admin-toggleable product for desktop photo upload feature      ║
-- ╚══════════════════════════════════════════════════════════════════╝

INSERT INTO products (name, description, price_cents, type, is_active, is_implemented, feature_key, sort_order, metadata)
VALUES (
  'Quick Photo Upload Link',
  'Let owners upload listing photos from any computer or tablet via a secure email link. Photos sync to the mobile app instantly.',
  0,
  'one_time',
  true,
  true,
  'photo_upload_link',
  10,
  '{"button_text": "Upload Photos from Computer", "link_expiration_minutes": 15}'
)
ON CONFLICT (feature_key) DO NOTHING;
