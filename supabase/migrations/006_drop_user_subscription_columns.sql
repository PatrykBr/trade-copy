-- 006_drop_user_subscription_columns.sql
-- Forward migration: remove denormalized subscription columns from users table
-- These were replaced by authoritative data in subscriptions table.

ALTER TABLE public.users DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE public.users DROP COLUMN IF EXISTS subscription_status;

-- (Optional) You may also want to document this in README or a schema changelog.
