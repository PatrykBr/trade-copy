-- Enable RLS on tables if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE copied_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE protection_rules ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trading accounts policies
CREATE POLICY "Users can view own trading accounts" ON trading_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trading accounts" ON trading_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading accounts" ON trading_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trading accounts" ON trading_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Copy mappings policies
CREATE POLICY "Users can view own copy mappings" ON copy_mappings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own copy mappings" ON copy_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own copy mappings" ON copy_mappings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own copy mappings" ON copy_mappings
  FOR DELETE USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "Users can view trades from own accounts" ON trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trades.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert trades to own accounts" ON trades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trades.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update trades on own accounts" ON trades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trades.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

-- Copied trades policies
CREATE POLICY "Users can view own copied trades" ON copied_trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM copy_mappings 
      WHERE copy_mappings.id = copied_trades.mapping_id 
      AND copy_mappings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own copied trades" ON copied_trades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM copy_mappings 
      WHERE copy_mappings.id = copied_trades.mapping_id 
      AND copy_mappings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own copied trades" ON copied_trades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM copy_mappings 
      WHERE copy_mappings.id = copied_trades.mapping_id 
      AND copy_mappings.user_id = auth.uid()
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Analytics snapshots policies
CREATE POLICY "Users can view own analytics" ON analytics_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = analytics_snapshots.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics" ON analytics_snapshots
  FOR INSERT WITH CHECK (true);

-- Protection rules policies
CREATE POLICY "Users can view own protection rules" ON protection_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own protection rules" ON protection_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own protection rules" ON protection_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own protection rules" ON protection_rules
  FOR DELETE USING (auth.uid() = user_id);