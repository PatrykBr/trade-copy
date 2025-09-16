-- Generic updated_at trigger infra & RLS for new tables

-- 1. Generic trigger function already exists (update_updated_at_column). Ensure it's present.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply to new tables if they have updated_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
    CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_audit' AND column_name='updated_at') THEN
    -- audit table currently does not have updated_at, skip
    NULL;
  END IF;
END $$;

-- 3. RLS enable & policies for new tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit ENABLE ROW LEVEL SECURITY;

-- Plans: readable by authenticated users, no writes (managed internally)
CREATE POLICY "Plans readable" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Plans no insert" ON public.plans FOR INSERT WITH CHECK (false);
CREATE POLICY "Plans no update" ON public.plans FOR UPDATE USING (false);
CREATE POLICY "Plans no delete" ON public.plans FOR DELETE USING (false);

-- stripe_events: no direct access (deny all)
CREATE POLICY "Stripe events deny select" ON public.stripe_events FOR SELECT USING (false);
CREATE POLICY "Stripe events deny modify" ON public.stripe_events FOR ALL USING (false) WITH CHECK (false);

-- subscription_audit: user can view own subscription changes
CREATE POLICY "Subscription audit view own" ON public.subscription_audit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Subscription audit no writes" ON public.subscription_audit FOR ALL USING (false) WITH CHECK (false);
