-- Indexes for better query performance
CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX idx_trading_accounts_platform_id ON public.trading_accounts(platform_id);
CREATE INDEX idx_trading_accounts_account_type ON public.trading_accounts(account_type);
CREATE INDEX idx_trading_accounts_is_active ON public.trading_accounts(is_active);

CREATE INDEX idx_copy_mappings_user_id ON public.copy_mappings(user_id);
CREATE INDEX idx_copy_mappings_master_account_id ON public.copy_mappings(master_account_id);
CREATE INDEX idx_copy_mappings_slave_account_id ON public.copy_mappings(slave_account_id);
CREATE INDEX idx_copy_mappings_is_active ON public.copy_mappings(is_active);

CREATE INDEX idx_trades_account_id ON public.trades(account_id);
CREATE INDEX idx_trades_symbol ON public.trades(symbol);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trades_opened_at ON public.trades(opened_at);
CREATE INDEX idx_trades_closed_at ON public.trades(closed_at);

CREATE INDEX idx_copied_trades_mapping_id ON public.copied_trades(mapping_id);
CREATE INDEX idx_copied_trades_master_trade_id ON public.copied_trades(master_trade_id);
CREATE INDEX idx_copied_trades_slave_trade_id ON public.copied_trades(slave_trade_id);
CREATE INDEX idx_copied_trades_copy_status ON public.copied_trades(copy_status);

CREATE INDEX idx_protection_rules_user_id ON public.protection_rules(user_id);
CREATE INDEX idx_protection_rules_account_id ON public.protection_rules(account_id);
CREATE INDEX idx_protection_rules_rule_type ON public.protection_rules(rule_type);
CREATE INDEX idx_protection_rules_is_active ON public.protection_rules(is_active);

CREATE INDEX idx_analytics_snapshots_account_id ON public.analytics_snapshots(account_id);
CREATE INDEX idx_analytics_snapshots_snapshot_date ON public.analytics_snapshots(snapshot_date);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);