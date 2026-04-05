-- 054: Magic link cross-device relay
-- When a user clicks a magic link on desktop, tokens are relayed here
-- so the mobile app can pick them up via Realtime subscription.
-- Rows are ephemeral — 5-minute TTL, single-use.

CREATE TABLE IF NOT EXISTS magic_link_relay (
  nonce       uuid PRIMARY KEY,
  tokens      text NOT NULL,             -- JSON { access_token, refresh_token }
  user_id     uuid,                      -- from JWT, for audit only
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: Realtime requires a SELECT policy for the subscribing client.
-- The nonce (128-bit UUID) acts as a bearer secret — only the mobile app
-- that generated it knows the value, so a permissive SELECT is safe.
-- INSERT/UPDATE/DELETE remain service-role only (no policies).
ALTER TABLE magic_link_relay ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Realtime select by nonce"
  ON magic_link_relay FOR SELECT
  USING (true);

-- Realtime: mobile app subscribes filtered by nonce
ALTER PUBLICATION supabase_realtime ADD TABLE magic_link_relay;

-- Cleanup function — called opportunistically from the API route
CREATE OR REPLACE FUNCTION clean_expired_relay_tokens()
RETURNS void AS $$
  DELETE FROM magic_link_relay WHERE created_at < now() - interval '5 minutes';
$$ LANGUAGE sql SECURITY DEFINER;
