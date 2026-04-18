-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Migration 072: handle_new_user — also populate roles[]          ║
-- ║  Previous trigger (070) set profiles.role from user_metadata but ║
-- ║  left profiles.roles to column default ARRAY['tenant'], producing║
-- ║  impossible states like role='owner' with roles=['tenant']. Fix  ║
-- ║  the trigger to set both atomically on signup.                   ║
-- ║                                                                  ║
-- ║  Part of the Phase 1 dual-role foundational correction           ║
-- ║  (project_auth_rebuild_plan.md Phase 3 gap closure, 2026-04-18). ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_role text;
BEGIN
  chosen_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');

  INSERT INTO public.profiles (id, display_name, email, role, roles, is_anonymous)
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
    CASE WHEN NEW.email IS NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;
