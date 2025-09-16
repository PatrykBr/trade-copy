-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copied_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Trading platforms policies (public read)
CREATE POLICY "Trading platforms are viewable by authenticated users" ON public.trading_platforms FOR SELECT TO authenticated USING (true);

-- Trading accounts policies
CREATE POLICY "Users can view own trading accounts" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trading accounts" ON public.trading_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trading accounts" ON public.trading_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trading accounts" ON public.trading_accounts FOR DELETE USING (auth.uid() = user_id);

-- Copy mappings policies
CREATE POLICY "Users can view own copy mappings" ON public.copy_mappings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own copy mappings" ON public.copy_mappings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own copy mappings" ON public.copy_mappings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own copy mappings" ON public.copy_mappings FOR DELETE USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "Users can view trades from own accounts" ON public.trades FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trading_accounts 
    WHERE trading_accounts.id = trades.account_id 
    AND trading_accounts.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert trades to own accounts" ON public.trades FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trading_accounts 
    WHERE trading_accounts.id = trades.account_id 
    AND trading_accounts.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update trades from own accounts" ON public.trades FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.trading_accounts 
    WHERE trading_accounts.id = trades.account_id 
    AND trading_accounts.user_id = auth.uid()
  )
);

-- Copied trades policies
CREATE POLICY "Users can view own copied trades" ON public.copied_trades FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.copy_mappings 
    WHERE copy_mappings.id = copied_trades.mapping_id 
    AND copy_mappings.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own copied trades" ON public.copied_trades FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.copy_mappings 
    WHERE copy_mappings.id = copied_trades.mapping_id 
    AND copy_mappings.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own copied trades" ON public.copied_trades FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.copy_mappings 
    WHERE copy_mappings.id = copied_trades.mapping_id 
    AND copy_mappings.user_id = auth.uid()
  )
);

-- Protection rules policies
CREATE POLICY "Users can view own protection rules" ON public.protection_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own protection rules" ON public.protection_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own protection rules" ON public.protection_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own protection rules" ON public.protection_rules FOR DELETE USING (auth.uid() = user_id);

-- Analytics snapshots policies
CREATE POLICY "Users can view analytics from own accounts" ON public.analytics_snapshots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trading_accounts 
    WHERE trading_accounts.id = analytics_snapshots.account_id 
    AND trading_accounts.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert analytics for own accounts" ON public.analytics_snapshots FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trading_accounts 
    WHERE trading_accounts.id = analytics_snapshots.account_id 
    AND trading_accounts.user_id = auth.uid()
  )
);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);