-- Fix delivery_status default: new messages should start as 'pending'
-- until a notification is actually sent/delivered.
-- The old default 'delivered' was misleading — showed double checks
-- before any notification was sent.

ALTER TABLE messages ALTER COLUMN delivery_status SET DEFAULT 'pending';
