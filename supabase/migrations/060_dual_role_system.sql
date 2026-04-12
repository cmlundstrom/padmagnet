-- Dual-role system: users can hold multiple roles simultaneously
-- profiles.role remains the PRIMARY/DEFAULT role (determines initial routing)
-- profiles.roles is the array of ALL available roles for the user

-- Add roles array column with default based on existing role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['tenant'];

-- Populate roles from existing role for all users
UPDATE profiles SET roles = ARRAY[role] WHERE roles = ARRAY['tenant'] AND role != 'tenant';

-- Admins and super_admins get all roles by default
UPDATE profiles SET roles = ARRAY['tenant', 'owner', 'admin']
  WHERE role IN ('admin', 'super_admin');

-- Create index for array queries
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN (roles);
