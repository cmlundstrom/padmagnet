-- Stop auto-defaulting profiles.display_name to the email local-part for
-- non-anonymous email signups. The previous behavior (migration 072) set
-- display_name to e.g. "chris" for chris@floridapm.net, which defeated
-- the new in-app post-auth Edit Profile interposition (the resolver checks
-- if display_name is empty before deciding whether to interpose).
--
-- New rules:
--   1. If signUp() / register passed an explicit display_name in
--      raw_user_meta_data, use it (unchanged).
--   2. If the user is ANONYMOUS (no email), default to 'Owner' or 'Renter'
--      based on user_metadata.role so nav UI has something to render
--      (unchanged from migration 072).
--   3. If the user has an email but no explicit display_name in metadata
--      (the magic-link case + future Google/Facebook with no name claim),
--      leave display_name NULL. The mobile app's resolvePostLoginDestination
--      checks for null/empty and interposes /settings/edit-profile?firstTime=true
--      so the user fills it themselves with a real name owners will see.
--
-- IMPORTANT — preserves the dual-role roles[] handling from migration 072:
-- atomically sets BOTH role and roles[] from user_metadata.role to avoid
-- the prior impossible state of role='owner' with roles=['tenant'].
--
-- This change is renter-and-owner-safe: for owners signing up via email,
-- they will also get NULL display_name. Owner-side onboarding (a separate
-- trace per 2026-04-25 discussion) can choose its own interposition later.
--
-- Migration applied 2026-04-26.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_role text;
BEGIN
  chosen_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');

  INSERT INTO public.profiles (id, display_name, email, role, roles, is_anonymous)
  VALUES (
    NEW.id,
    CASE
      -- Explicit name from signUp() options — always honor
      WHEN NEW.raw_user_meta_data->>'display_name' IS NOT NULL
        THEN NEW.raw_user_meta_data->>'display_name'
      -- Anonymous owner — default placeholder for nav UI
      WHEN NEW.email IS NULL AND chosen_role = 'owner'
        THEN 'Owner'
      -- Anonymous renter — default placeholder for nav UI
      WHEN NEW.email IS NULL
        THEN 'Renter'
      -- Email signup with no explicit name → leave NULL so the in-app
      -- post-auth Edit Profile interposition fires
      ELSE NULL
    END,
    COALESCE(NEW.email, ''),
    chosen_role,
    ARRAY[chosen_role],
    CASE WHEN NEW.email IS NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;
