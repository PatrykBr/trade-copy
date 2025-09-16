-- Billing infrastructure enhancements
-- 1. Enum for subscription status
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active','canceled','past_due','incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Alter subscriptions.status to use enum (drop old check constraint if present)
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ALTER COLUMN status TYPE subscription_status USING status::subscription_status;

-- 3. Add stripe_price_id column if missing
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON public.subscriptions(user_id) WHERE status = 'active';

-- 4. Plans metadata table
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stripe_price_id TEXT UNIQUE,
  interval TEXT NOT NULL CHECK (interval IN ('monthly','yearly')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_accounts INTEGER NOT NULL,
  max_copy_mappings INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed plans (idempotent upserts based on primary key)
INSERT INTO public.plans (id, name, stripe_price_id, interval, price, max_accounts, max_copy_mappings, is_default)
VALUES
 ('free','Free', NULL, 'monthly', 0, 2, 1, true),
 ('starter','Starter', coalesce(NULLIF(current_setting('app.stripe_starter_price_id', true),''), NULL), 'monthly', 29, 5, 3, false),
 ('pro','Professional', coalesce(NULLIF(current_setting('app.stripe_pro_price_id', true),''), NULL), 'monthly', 79, 15, 10, false),
 ('enterprise','Enterprise', coalesce(NULLIF(current_setting('app.stripe_enterprise_price_id', true),''), NULL), 'monthly', 199, -1, -1, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  stripe_price_id = EXCLUDED.stripe_price_id,
  interval = EXCLUDED.interval,
  price = EXCLUDED.price,
  max_accounts = EXCLUDED.max_accounts,
  max_copy_mappings = EXCLUDED.max_copy_mappings,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();

-- 5. Stripe events table for idempotency
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY, -- Stripe event id
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_status ON public.stripe_events(status);

-- 6. Subscription audit trail
CREATE TABLE IF NOT EXISTS public.subscription_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  previous_status subscription_status,
  new_status subscription_status,
  previous_plan_name TEXT,
  new_plan_name TEXT,
  event_id TEXT, -- associated stripe event if available
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_sub ON public.subscription_audit(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_user ON public.subscription_audit(user_id);

-- 7. Trigger to capture subscription status / plan changes
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.plan_name IS DISTINCT FROM OLD.plan_name) THEN
    INSERT INTO public.subscription_audit (
      subscription_id, user_id, previous_status, new_status, previous_plan_name, new_plan_name, event_id
    ) VALUES (
      OLD.id, OLD.user_id, OLD.status, NEW.status, OLD.plan_name, NEW.plan_name, current_setting('app.current_stripe_event_id', true)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_subscription_change ON public.subscriptions;
CREATE TRIGGER trg_log_subscription_change
AFTER UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();
