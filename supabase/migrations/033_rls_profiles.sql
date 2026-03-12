-- Migration 033: Enable RLS on profiles table
-- Step 3 of role architecture fix (see memory/role-architecture-fix.md)
--
-- After this migration:
-- - Authenticated users can only read/update their own profile row
-- - Service role (used by all admin API routes) bypasses RLS automatically
-- - The handle_new_user() trigger is SECURITY DEFINER so it can still INSERT

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- No INSERT policy needed for regular users — the handle_new_user() trigger
-- runs as SECURITY DEFINER and handles all profile creation on signup.
-- No DELETE policy — users cannot delete their own profile (admin only via service_role).
