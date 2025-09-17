-- TradeCopy Pro - Database Schema
-- Organized by: Types/Enums → Tables → Indexes → Functions → Triggers → RLS Policies → Seed Data

-- =============================================================================
-- 1. CUSTOM TYPES AND ENUMS
-- =============================================================================

-- Subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active','canceled','past_due','incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 2. TABLE DEFINITIONS
-- =============================================================================

-- Users table extension (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading platforms table
CREATE TABLE public.trading_platforms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  api_endpoint TEXT,
  logo_url TEXT,
  supports_copy_trading BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading accounts table
CREATE TABLE public.trading_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  platform_id UUID REFERENCES public.trading_platforms(id) ON DELETE RESTRICT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('master', 'slave')),
  is_active BOOLEAN DEFAULT true,
  encrypted_credentials TEXT, -- Encrypted JSON with platform-specific credentials
  balance DECIMAL(15,2),
  equity DECIMAL(15,2),
  margin DECIMAL(15,2),
  free_margin DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  server TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform_id, account_number)
);

-- Copy mappings table (master -> slave relationships)
CREATE TABLE public.copy_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  master_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE NOT NULL,
  slave_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE NOT NULL,
  lot_scaling_type TEXT DEFAULT 'percentage' CHECK (lot_scaling_type IN ('fixed', 'percentage', 'balance_ratio')),
  lot_scaling_value DECIMAL(10,4) DEFAULT 1.0,
  copy_symbols TEXT[], -- Array of symbols to copy (empty = all)
  ignore_symbols TEXT[], -- Array of symbols to ignore
  max_lot_size DECIMAL(10,2),
  min_lot_size DECIMAL(10,2),
  copy_sl_tp BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, master_account_id, slave_account_id)
);

-- Trades table
CREATE TABLE public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE NOT NULL,
  platform_trade_id TEXT NOT NULL, -- Trade ID from the trading platform
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  lot_size DECIMAL(10,2) NOT NULL,
  open_price DECIMAL(15,5) NOT NULL,
  close_price DECIMAL(15,5),
  stop_loss DECIMAL(15,5),
  take_profit DECIMAL(15,5),
  swap DECIMAL(15,2) DEFAULT 0,
  commission DECIMAL(15,2) DEFAULT 0,
  profit_loss DECIMAL(15,2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, platform_trade_id)
);

-- Copied trades table (tracks copy operations)
CREATE TABLE public.copied_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mapping_id UUID REFERENCES public.copy_mappings(id) ON DELETE CASCADE NOT NULL,
  master_trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE NOT NULL,
  slave_trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
  copy_status TEXT DEFAULT 'pending' CHECK (copy_status IN ('pending', 'success', 'failed', 'partial')),
  error_message TEXT,
  copied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Protection rules table
CREATE TABLE public.protection_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE, -- NULL = applies to all accounts
  rule_type TEXT NOT NULL CHECK (rule_type IN ('equity_drawdown', 'daily_loss', 'news_protection', 'time_restriction')),
  threshold_value DECIMAL(15,2),
  threshold_percentage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics snapshots table
CREATE TABLE public.analytics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  equity DECIMAL(15,2) NOT NULL,
  margin DECIMAL(15,2) DEFAULT 0,
  free_margin DECIMAL(15,2) DEFAULT 0,
  profit_loss DECIMAL(15,2) DEFAULT 0,
  daily_pnl DECIMAL(15,2) DEFAULT 0,
  monthly_pnl DECIMAL(15,2) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, snapshot_date)
);

-- Subscriptions table (updated with enum and additional columns)
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  max_accounts INTEGER DEFAULT 2,
  max_copy_mappings INTEGER DEFAULT 1,
  status subscription_status DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Plans metadata table
CREATE TABLE public.plans (
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

-- Stripe events table for idempotency
CREATE TABLE public.stripe_events (
  id TEXT PRIMARY KEY, -- Stripe event id
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Subscription audit trail
CREATE TABLE public.subscription_audit (
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

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- Trading accounts indexes
CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX idx_trading_accounts_platform_id ON public.trading_accounts(platform_id);
CREATE INDEX idx_trading_accounts_account_type ON public.trading_accounts(account_type);
CREATE INDEX idx_trading_accounts_is_active ON public.trading_accounts(is_active);

-- Copy mappings indexes
CREATE INDEX idx_copy_mappings_user_id ON public.copy_mappings(user_id);
CREATE INDEX idx_copy_mappings_master_account_id ON public.copy_mappings(master_account_id);
CREATE INDEX idx_copy_mappings_slave_account_id ON public.copy_mappings(slave_account_id);
CREATE INDEX idx_copy_mappings_is_active ON public.copy_mappings(is_active);

-- Trades indexes
CREATE INDEX idx_trades_account_id ON public.trades(account_id);
CREATE INDEX idx_trades_symbol ON public.trades(symbol);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trades_opened_at ON public.trades(opened_at);
CREATE INDEX idx_trades_closed_at ON public.trades(closed_at);

-- Copied trades indexes
CREATE INDEX idx_copied_trades_mapping_id ON public.copied_trades(mapping_id);
CREATE INDEX idx_copied_trades_master_trade_id ON public.copied_trades(master_trade_id);
CREATE INDEX idx_copied_trades_slave_trade_id ON public.copied_trades(slave_trade_id);
CREATE INDEX idx_copied_trades_copy_status ON public.copied_trades(copy_status);

-- Protection rules indexes
CREATE INDEX idx_protection_rules_user_id ON public.protection_rules(user_id);
CREATE INDEX idx_protection_rules_account_id ON public.protection_rules(account_id);
CREATE INDEX idx_protection_rules_rule_type ON public.protection_rules(rule_type);
CREATE INDEX idx_protection_rules_is_active ON public.protection_rules(is_active);

-- Analytics snapshots indexes
CREATE INDEX idx_analytics_snapshots_account_id ON public.analytics_snapshots(account_id);
CREATE INDEX idx_analytics_snapshots_snapshot_date ON public.analytics_snapshots(snapshot_date);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_user_active ON public.subscriptions(user_id) WHERE status = 'active';

-- Additional indexes for new tables
CREATE INDEX idx_stripe_events_status ON public.stripe_events(status);
CREATE INDEX idx_subscription_audit_sub ON public.subscription_audit(subscription_id);
CREATE INDEX idx_subscription_audit_user ON public.subscription_audit(user_id);

-- =============================================================================
-- 4. FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate profit/loss for trades
CREATE OR REPLACE FUNCTION calculate_trade_pnl(
  p_trade_type TEXT,
  p_open_price DECIMAL,
  p_close_price DECIMAL,
  p_lot_size DECIMAL,
  p_symbol TEXT DEFAULT 'UNKNOWN'
)
RETURNS DECIMAL AS $$
DECLARE
  point_value DECIMAL := 10; -- Default point value, should be symbol-specific
  pip_difference DECIMAL;
BEGIN
  IF p_close_price IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate pip difference based on trade type
  IF p_trade_type = 'buy' THEN
    pip_difference := p_close_price - p_open_price;
  ELSE -- sell
    pip_difference := p_open_price - p_close_price;
  END IF;
  
  -- Convert to points (multiply by 10000 for most forex pairs)
  pip_difference := pip_difference * 10000;
  
  -- Calculate P&L
  RETURN pip_difference * p_lot_size * point_value;
END;
$$ LANGUAGE plpgsql;

-- Function to update trade P&L when closing
CREATE OR REPLACE FUNCTION update_trade_pnl()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if close_price is being set and status is closed
  IF NEW.close_price IS NOT NULL AND NEW.status = 'closed' AND OLD.close_price IS NULL THEN
    NEW.profit_loss := calculate_trade_pnl(
      NEW.trade_type,
      NEW.open_price,
      NEW.close_price,
      NEW.lot_size,
      NEW.symbol
    );
    NEW.closed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to capture subscription status / plan changes
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

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Auto-create user profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update timestamps
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_accounts_updated_at 
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copy_mappings_updated_at 
  BEFORE UPDATE ON public.copy_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at 
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copied_trades_updated_at 
  BEFORE UPDATE ON public.copied_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protection_rules_updated_at 
  BEFORE UPDATE ON public.protection_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_plans_updated_at 
  BEFORE UPDATE ON public.plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate trade P&L
CREATE TRIGGER calculate_trade_pnl_trigger 
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION update_trade_pnl();

-- Log subscription changes
CREATE TRIGGER trg_log_subscription_change
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

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
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit ENABLE ROW LEVEL SECURITY;

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

-- Plans policies (readable by authenticated users, no writes)
CREATE POLICY "Plans readable" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Plans no insert" ON public.plans FOR INSERT WITH CHECK (false);
CREATE POLICY "Plans no update" ON public.plans FOR UPDATE USING (false);
CREATE POLICY "Plans no delete" ON public.plans FOR DELETE USING (false);

-- Stripe events policies (no direct access)
CREATE POLICY "Stripe events deny select" ON public.stripe_events FOR SELECT USING (false);
CREATE POLICY "Stripe events deny modify" ON public.stripe_events FOR ALL USING (false) WITH CHECK (false);

-- Subscription audit policies (user can view own subscription changes)
CREATE POLICY "Subscription audit view own" ON public.subscription_audit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Subscription audit no writes" ON public.subscription_audit FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 7. SEED DATA
-- =============================================================================

-- Insert default trading platforms
INSERT INTO public.trading_platforms (name, code, api_endpoint, supports_copy_trading, is_active) VALUES
('cTrader', 'ctrader', 'https://api.ctrader.com', true, true),
('MetaTrader 4', 'mt4', null, true, true),
('MetaTrader 5', 'mt5', null, true, true),
('TradingView', 'tradingview', 'https://api.tradingview.com', false, false),
('Interactive Brokers', 'ib', 'https://api.interactivebrokers.com', true, false);

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

-- Insert default subscription plans (for users without Stripe)
-- Note: This will be handled by application logic when users sign up