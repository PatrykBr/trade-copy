export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface TradingPlatform {
  id: string
  name: string
  code: string
  api_endpoint?: string
  logo_url?: string
  supports_copy_trading: boolean
  is_active: boolean
  created_at: string
}

export interface TradingAccount {
  id: string
  user_id: string
  platform_id: string
  account_name: string
  account_number: string
  account_type: 'master' | 'slave'
  is_active: boolean
  encrypted_credentials?: string
  balance?: number
  equity?: number
  margin?: number
  free_margin?: number
  currency: string
  server?: string
  last_sync_at?: string
  created_at: string
  updated_at: string
  platform?: TradingPlatform
}

export interface CopyMapping {
  id: string
  user_id: string
  master_account_id: string
  slave_account_id: string
  lot_scaling_type: 'fixed' | 'percentage' | 'balance_ratio'
  lot_scaling_value: number
  copy_symbols?: string[]
  ignore_symbols?: string[]
  max_lot_size?: number
  min_lot_size?: number
  copy_sl_tp: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  master_account?: TradingAccount
  slave_account?: TradingAccount
}

export interface Trade {
  id: string
  account_id: string
  platform_trade_id: string
  symbol: string
  trade_type: 'buy' | 'sell'
  lot_size: number
  open_price: number
  close_price?: number
  stop_loss?: number
  take_profit?: number
  swap?: number
  commission?: number
  profit_loss?: number
  status: 'open' | 'closed' | 'pending'
  opened_at: string
  closed_at?: string
  created_at: string
  updated_at: string
  account?: TradingAccount
}

export interface CopiedTrade {
  id: string
  mapping_id: string
  master_trade_id: string
  slave_trade_id?: string
  copy_status: 'pending' | 'success' | 'failed' | 'partial'
  error_message?: string
  copied_at?: string
  created_at: string
  updated_at: string
  master_trade?: Trade
  slave_trade?: Trade
  mapping?: CopyMapping
}

export interface ProtectionRule {
  id: string
  user_id: string
  account_id?: string
  rule_type: 'equity_drawdown' | 'daily_loss' | 'news_protection' | 'time_restriction'
  threshold_value?: number
  threshold_percentage?: number
  is_active: boolean
  triggered_at?: string
  created_at: string
  updated_at: string
  account?: TradingAccount
}

export interface AnalyticsSnapshot {
  id: string
  account_id: string
  balance: number
  equity: number
  margin: number
  free_margin: number
  profit_loss: number
  daily_pnl: number
  monthly_pnl: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  snapshot_date: string
  created_at: string
  account?: TradingAccount
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id?: string
  stripe_customer_id?: string
  plan_name: string
  plan_price: number
  billing_cycle: 'monthly' | 'yearly'
  max_accounts: number
  max_copy_mappings: number
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  confirmPassword: string
  fullName?: string
}

export interface TradingAccountForm {
  platform_id: string
  account_name: string
  account_number: string
  account_type: 'master' | 'slave'
  currency: string
  server?: string
  username?: string
  password?: string
}

export interface CopyMappingForm {
  master_account_id: string
  slave_account_id: string
  lot_scaling_type: 'fixed' | 'percentage' | 'balance_ratio'
  lot_scaling_value: number
  copy_symbols?: string[]
  ignore_symbols?: string[]
  max_lot_size?: number
  min_lot_size?: number
  copy_sl_tp: boolean
}

export interface ProtectionRuleForm {
  account_id?: string
  rule_type: 'equity_drawdown' | 'daily_loss' | 'news_protection' | 'time_restriction'
  threshold_value?: number
  threshold_percentage?: number
}

// Dashboard types
export interface DashboardStats {
  total_accounts: number
  active_mappings: number
  total_trades_today: number
  total_pnl: number
  daily_pnl: number
  monthly_pnl: number
  equity_growth_percentage: number
  win_rate: number
}

export interface PortfolioPerformance {
  account_id: string
  account_name: string
  balance: number
  equity: number
  daily_pnl: number
  monthly_pnl: number
  total_pnl: number
  profit_percentage: number
  trade_count: number
  win_rate: number
}

// Trading platform specific types
export interface PlatformConnection {
  platform: string
  status: 'connected' | 'disconnected' | 'error'
  last_ping?: string
  latency?: number
  error_message?: string
}

export interface MarketData {
  symbol: string
  bid: number
  ask: number
  spread: number
  timestamp: string
}

export interface TradingSignal {
  symbol: string
  action: 'buy' | 'sell' | 'close'
  lot_size: number
  price?: number
  stop_loss?: number
  take_profit?: number
  comment?: string
  magic_number?: number
}