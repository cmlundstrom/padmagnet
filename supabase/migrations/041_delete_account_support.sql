-- Allow tenant_user_id to be NULL (for account deletion anonymization)
ALTER TABLE conversations ALTER COLUMN tenant_user_id DROP NOT NULL;
