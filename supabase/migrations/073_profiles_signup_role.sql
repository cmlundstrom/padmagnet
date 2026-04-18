-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 073: profiles.signup_role (immutable origin)          ║
-- ║  Tracks the user's ORIGINAL role at signup — never changes after ║
-- ║  INSERT, regardless of later role switches or admin edits. Lets  ║
-- ║  the admin dashboard answer "where did this user come from?"     ║
-- ║  independently of their current active role.                     ║
-- ║                                                                  ║
-- ║  Part of the Phase 2 dual-role foundational correction (task #24)║
-- ║  — new requirement raised 2026-04-18 beyond the original         ║
-- ║  project_auth_rebuild_plan.md Phase 3 scope.                     ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_role text;

-- Backfill for existing users. Best available guess: current role is the
-- closest approximation of their origin. Admins with all roles get their
-- primary role ('super_admin' or 'admin'). This only runs for NULL values
-- so re-runs are idempotent.
UPDATE profiles SET signup_role = role WHERE signup_role IS NULL;

-- Update handle_new_user trigger to populate signup_role on INSERT.
-- Uses the same chosen_role value that sets role + roles[] so all three
-- are consistent on signup. signup_role never updated after — application
-- code must treat it as read-only.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_role text;
BEGIN
  chosen_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');

  INSERT INTO public.profiles (id, display_name, email, role, roles, signup_role, is_anonymous)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      CASE
        WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1)
        WHEN chosen_role = 'owner' THEN 'Owner'
        ELSE 'Renter'
      END
    ),
    COALESCE(NEW.email, ''),
    chosen_role,
    ARRAY[chosen_role],
    chosen_role,
    CASE WHEN NEW.email IS NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;
