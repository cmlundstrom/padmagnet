-- Fix handle_new_user: anonymous owners should default to 'Owner', not 'Renter'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role, is_anonymous)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      CASE
        WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1)
        WHEN NEW.raw_user_meta_data->>'role' = 'owner' THEN 'Owner'
        ELSE 'Renter'
      END
    ),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    CASE WHEN NEW.email IS NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;
