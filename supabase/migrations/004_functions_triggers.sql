-- Functions and triggers for automatic timestamping

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_accounts_updated_at BEFORE UPDATE ON public.trading_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copy_mappings_updated_at BEFORE UPDATE ON public.copy_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copied_trades_updated_at BEFORE UPDATE ON public.copied_trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protection_rules_updated_at BEFORE UPDATE ON public.protection_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
$$ language 'plpgsql';

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
$$ language 'plpgsql';

-- Trigger to auto-calculate P&L
CREATE TRIGGER calculate_trade_pnl_trigger BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION update_trade_pnl();