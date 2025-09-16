-- Insert default trading platforms
INSERT INTO public.trading_platforms (name, code, api_endpoint, supports_copy_trading, is_active) VALUES
('cTrader', 'ctrader', 'https://api.ctrader.com', true, true),
('MetaTrader 4', 'mt4', null, true, true),
('MetaTrader 5', 'mt5', null, true, true),
('TradingView', 'tradingview', 'https://api.tradingview.com', false, false),
('Interactive Brokers', 'ib', 'https://api.interactivebrokers.com', true, false);

-- Insert default subscription plans (for users without Stripe)
INSERT INTO public.subscriptions (
  user_id, 
  plan_name, 
  plan_price, 
  billing_cycle, 
  max_accounts, 
  max_copy_mappings,
  status,
  current_period_start,
  current_period_end
) 
SELECT 
  id,
  'Free',
  0.00,
  'monthly',
  2,
  1,
  'active',
  NOW(),
  NOW() + INTERVAL '1 month'
FROM public.users 
WHERE id NOT IN (SELECT user_id FROM public.subscriptions);