-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 015: Messaging multichannel                          ║
-- ║  Extends conversations/messages for Twilio SMS + email.         ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS primary_channel text DEFAULT 'in_app'
  CHECK (primary_channel IN ('in_app','sms','email'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS twilio_conversation_sid text;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel text DEFAULT 'in_app'
  CHECK (channel IN ('in_app','sms','email'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'delivered'
  CHECK (delivery_status IN ('pending','sent','delivered','failed'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_phone text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_phone text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_email text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_email text;
