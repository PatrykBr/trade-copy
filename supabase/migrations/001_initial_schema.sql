-- Users table extension (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'incomplete')),
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

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  max_accounts INTEGER DEFAULT 2,
  max_copy_mappings INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);