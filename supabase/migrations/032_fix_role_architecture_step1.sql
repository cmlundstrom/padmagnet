-- Migration 032: Role Architecture Fix — Step 1
-- Fix profile trigger, add CHECK constraint, backfill display_name drift
-- Part of 8-step role architecture fix (see memory/role-architecture-fix.md)

-- Part A: Add CHECK constraint to lock profiles.role to valid values only
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('tenant', 'owner', 'admin', 'super_admin'));

-- Part B: Update trigger to copy role from auth metadata into profiles
-- Previously: only copied id, display_name, email (role defaulted to 'tenant')
-- Now: also copies role from raw_user_meta_data, falls back to 'tenant'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant')
  );
  RETURN NEW;
END;
$function$;

-- Part C: Backfill display_name drift on test accounts
-- Trigger ran before metadata was set, so display_name got email prefix instead of real name
UPDATE profiles SET display_name = 'Chris Tenant-test'
WHERE email = 'info@floridapm.net' AND display_name = 'info';

UPDATE profiles SET display_name = 'Christopher PropertyOwner-test'
WHERE email = 'maintenance@floridapm.net' AND display_name = 'maintenance';

-- Part D: Ensure DEFAULT is 'tenant' (defensive — already correct in live DB,
-- but migration 004 file says 'admin', so this documents the intended state)
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'tenant';
