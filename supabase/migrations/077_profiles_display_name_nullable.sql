-- Drop the NOT NULL constraint on profiles.display_name.
--
-- Migration 076 changed handle_new_user() to leave display_name NULL for
-- email signups with no explicit name (so the in-app post-auth Edit
-- Profile interposition can prompt for a real name owners will see).
-- Without this constraint drop, every new email signup hits a 23502
-- not-null violation and registration fails outright.
--
-- Application code reads profiles.display_name everywhere; nullable is
-- safe because:
--   - Anonymous users still get 'Owner' or 'Renter' from the trigger
--     (so nav UI always has a value)
--   - Email signup users get NULL → app's resolvePostLoginDestination
--     interposes Edit Profile to capture it before swipe / messages
--   - Subsequent reads in tabs already coalesce display_name || email ||
--     'User' for safe fallback rendering
--
-- Migration applied 2026-04-26.

ALTER TABLE public.profiles
  ALTER COLUMN display_name DROP NOT NULL;
