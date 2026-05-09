-- Migration 081: UGC moderation — user blocks + content reports
--
-- Required for Google Play UGC Policy compliance (Closed Testing +
-- Production gate). PadMagnet has user-generated content via owner
-- listings + 1:1 renter↔owner messaging, both of which require:
--   1. In-app reporting for objectionable content/users
--   2. In-app blocking for 1:1 interactions
--   3. Server-side enforcement so blocked content never reaches the wire
--
-- This migration adds:
--   - user_blocks table  : (blocker_id, blocked_id) directed edges
--   - content_reports    : reports against listings/users/messages
--   - is_blocked(a,b)    : symmetric helper used by API + RPC layer
--   - nearby_rentals_search RPC gains optional viewer_id param so the
--     renter swipe deck can filter out blocked-owner listings; existing
--     callers (no viewer_id) keep working unchanged.
--
-- Visibility semantics (one-way blocks for listing browsing, mutual
-- enforcement for messaging):
--   - When A blocks B: A's swipe deck excludes B's owner listings.
--   - A's /api/conversations excludes any thread with B.
--   - /api/messages send fails 403 in either direction.
--   - B's view of A's listings is UNCHANGED (one-way prevents leak; B
--     never learns they were blocked).
--
-- MLS listings (source='mls', owner_user_id IS NULL) are reportable
-- but NOT auto-hidden by user-blocks — there's no user to attribute
-- them to. Admin handles via Reports queue + listing.is_active=false.
--
-- v1.0.1 launch blocker. See project_ugc_moderation_v101.md for the
-- full design proposal.
--
-- Created 2026-05-09.

-- ── 1. user_blocks ────────────────────────────────────────────────
-- Directed edge: blocker_id has blocked blocked_id. Symmetric semantics
-- (mutual messaging block) are enforced by is_blocked() below — the row
-- itself is one-way so we know who initiated.

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason_code TEXT,           -- optional category at block time
  free_text   TEXT,           -- optional, ≤ 500 chars
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id),
  CHECK (free_text IS NULL OR CHAR_LENGTH(free_text) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
  ON user_blocks (blocker_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON user_blocks (blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: users see + manage only their own outgoing blocks.
DROP POLICY IF EXISTS user_blocks_owner_select ON user_blocks;
CREATE POLICY user_blocks_owner_select
  ON user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS user_blocks_owner_insert ON user_blocks;
CREATE POLICY user_blocks_owner_insert
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS user_blocks_owner_delete ON user_blocks;
CREATE POLICY user_blocks_owner_delete
  ON user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Service role bypasses RLS by default; no explicit policy needed.

-- ── 2. content_reports ────────────────────────────────────────────
-- Reports against listings, users, individual messages, or whole
-- conversations. Polymorphic target via (content_type, content_id).

CREATE TABLE IF NOT EXISTS content_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  reporter_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type    TEXT NOT NULL,
  content_id      UUID NOT NULL,
  reason_code     TEXT NOT NULL,
  free_text       TEXT,

  status          TEXT NOT NULL DEFAULT 'open',
  resolution_action TEXT,
  resolution_notes  TEXT,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (content_type IN ('listing','user','message','conversation')),
  CHECK (reason_code IN (
    'spam','harassment','fake_listing','sexual_content',
    'hate_speech','illegal','scam','other'
  )),
  CHECK (status IN ('open','triaged','resolved','dismissed')),
  CHECK (resolution_action IS NULL OR resolution_action IN (
    'dismissed','warned_user','content_hidden','user_banned','escalated_legal'
  )),
  CHECK (free_text IS NULL OR CHAR_LENGTH(free_text) <= 500)
);

-- Triage queue: status + age, descending recency.
CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON content_reports (status, created_at DESC);

-- Per-target lookup (for "how many reports against this listing?").
CREATE INDEX IF NOT EXISTS idx_content_reports_target
  ON content_reports (content_type, content_id);

-- Reporter history.
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter
  ON content_reports (reporter_id);

-- Anti-flood: one OPEN report per (reporter, target) — prevents a
-- single user spamming a target. Resolved/dismissed reports don't
-- count toward this constraint, so a target can be re-reported by the
-- same reporter after their prior report is closed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_open_report_per_target
  ON content_reports (reporter_id, content_type, content_id)
  WHERE status = 'open';

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Policy: reporters can insert; reporters can read their own; updates
-- only via service role (admin path).
DROP POLICY IF EXISTS content_reports_self_insert ON content_reports;
CREATE POLICY content_reports_self_insert
  ON content_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS content_reports_self_select ON content_reports;
CREATE POLICY content_reports_self_select
  ON content_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- No update / delete policies for authenticated role — admin actions
-- run as service role.

-- ── 3. is_blocked() helper ────────────────────────────────────────
-- Symmetric: returns true if EITHER user has blocked the other.
-- Used by /api/messages (send + read filter), /api/conversations
-- (list filter), and nearby_rentals_search RPC (swipe deck filter).

DROP FUNCTION IF EXISTS is_blocked(UUID, UUID);

CREATE FUNCTION is_blocked(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

GRANT EXECUTE ON FUNCTION is_blocked(UUID, UUID) TO authenticated, service_role;

-- ── 4. nearby_rentals_search RPC — add viewer_id param ────────────
-- Optional UUID param so the renter swipe deck / nearby grid can pass
-- the viewer's auth.uid() and have blocked-owner listings filtered out
-- server-side. Existing callers (no viewer_id) keep working — the
-- viewer-filter clause is a no-op when viewer_id IS NULL.
--
-- DROP first because Postgres rejects parameter-list changes via
-- CREATE OR REPLACE FUNCTION (42P13 "cannot change return type of
-- existing function" — the error wording covers signature drift too).

DROP FUNCTION IF EXISTS nearby_rentals_search(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
  INTEGER, INTEGER, INTEGER, INTEGER,
  UUID, INTEGER, INTEGER
);

CREATE FUNCTION nearby_rentals_search(
  subject_lat       DOUBLE PRECISION,
  subject_lng       DOUBLE PRECISION,
  radius_miles      DOUBLE PRECISION,
  min_lat           DOUBLE PRECISION,
  max_lat           DOUBLE PRECISION,
  min_lng           DOUBLE PRECISION,
  max_lng           DOUBLE PRECISION,
  filter_beds       INTEGER DEFAULT NULL,
  filter_baths      INTEGER DEFAULT NULL,
  filter_min_sqft   INTEGER DEFAULT NULL,
  filter_max_sqft   INTEGER DEFAULT NULL,
  exclude_id        UUID    DEFAULT NULL,
  result_limit      INTEGER DEFAULT 21,
  result_offset     INTEGER DEFAULT 0,
  viewer_id         UUID    DEFAULT NULL  -- NEW: filters out listings owned by viewer's blocked users
)
RETURNS TABLE (
  id                 UUID,
  listing_key        TEXT,
  source             TEXT,
  street_number      TEXT,
  street_name        TEXT,
  city               TEXT,
  state_or_province  TEXT,
  postal_code        TEXT,
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  list_price         NUMERIC,
  bedrooms_total     INTEGER,
  bathrooms_total    INTEGER,
  living_area        NUMERIC,
  days_on_market     INTEGER,
  photos             JSONB,
  distance_miles     DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      l.id,
      l.listing_key,
      l.source,
      l.street_number,
      l.street_name,
      l.city,
      l.state_or_province,
      l.postal_code,
      l.latitude,
      l.longitude,
      l.list_price,
      l.bedrooms_total,
      l.bathrooms_total,
      l.living_area,
      l.days_on_market,
      l.photos,
      3958.8 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(l.latitude - subject_lat) / 2), 2) +
        COS(RADIANS(subject_lat)) * COS(RADIANS(l.latitude)) *
        POWER(SIN(RADIANS(l.longitude - subject_lng) / 2), 2)
      )) AS distance_miles
    FROM listings l
    WHERE
      l.is_demo = false
      AND l.status = 'active'
      AND l.is_active = true
      AND l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
      AND l.latitude BETWEEN min_lat AND max_lat
      AND l.longitude BETWEEN min_lng AND max_lng
      AND (exclude_id IS NULL OR l.id != exclude_id)
      AND (filter_beds IS NULL OR l.bedrooms_total = filter_beds)
      AND (filter_baths IS NULL OR l.bathrooms_total >= filter_baths)
      AND (filter_min_sqft IS NULL OR l.living_area >= filter_min_sqft)
      AND (filter_max_sqft IS NULL OR l.living_area <= filter_max_sqft)
      -- viewer block filter: exclude listings whose owner is in the
      -- viewer's blocked set (or who has blocked the viewer).
      -- NULL viewer_id is a no-op; only owner-source listings have a
      -- non-null owner_user_id, so MLS rows pass through unfiltered.
      AND (
        viewer_id IS NULL
        OR l.owner_user_id IS NULL
        OR NOT is_blocked(viewer_id, l.owner_user_id)
      )
  ) sub
  WHERE sub.distance_miles <= radius_miles
  ORDER BY sub.distance_miles ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── 5. Comments ───────────────────────────────────────────────────

COMMENT ON TABLE user_blocks IS
  'Per-user block list. One-way row; symmetric enforcement via is_blocked().';

COMMENT ON TABLE content_reports IS
  'User-submitted reports of objectionable UGC. Triage queue for admin.';

COMMENT ON FUNCTION is_blocked(UUID, UUID) IS
  'Returns true if either user has blocked the other. Used by message + listing visibility filters.';
