-- Migration: Add copy instructions table and trade bridge support
-- Created: 2025-01-16

-- Copy instructions table for HTTP-based communication
CREATE TABLE public.copy_instructions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mapping_id UUID REFERENCES public.copy_mappings(id) ON DELETE CASCADE NOT NULL,
  master_trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE NOT NULL,
  instruction_data JSONB NOT NULL, -- Copy instruction payload
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fetched', 'completed', 'failed', 'expired')),
  fetched_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'), -- Instructions expire after 5 minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connection status table for tracking EA connections
CREATE TABLE public.ea_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE NOT NULL,
  connection_type TEXT DEFAULT 'http' CHECK (connection_type IN ('websocket', 'http')),
  connection_id TEXT, -- WebSocket connection ID or session identifier
  ip_address INET,
  user_agent TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('MT4', 'MT5')),
  ea_version TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connection_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disconnect_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE public.trade_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_volume DECIMAL(15,2) DEFAULT 0,
  gross_profit DECIMAL(15,2) DEFAULT 0,
  gross_loss DECIMAL(15,2) DEFAULT 0,
  net_profit DECIMAL(15,2) DEFAULT 0,
  max_drawdown DECIMAL(15,2) DEFAULT 0,
  max_consecutive_wins INTEGER DEFAULT 0,
  max_consecutive_losses INTEGER DEFAULT 0,
  average_win DECIMAL(15,2) DEFAULT 0,
  average_loss DECIMAL(15,2) DEFAULT 0,
  largest_win DECIMAL(15,2) DEFAULT 0,
  largest_loss DECIMAL(15,2) DEFAULT 0,
  profit_factor DECIMAL(10,4) DEFAULT 0,
  sharpe_ratio DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, metric_date)
);

-- Copy performance tracking
CREATE TABLE public.copy_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mapping_id UUID REFERENCES public.copy_mappings(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  total_signals INTEGER DEFAULT 0,
  executed_signals INTEGER DEFAULT 0,
  failed_signals INTEGER DEFAULT 0,
  average_latency_ms INTEGER DEFAULT 0,
  max_latency_ms INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  total_volume_copied DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mapping_id, metric_date)
);

-- Add indexes for performance
CREATE INDEX idx_copy_instructions_status ON public.copy_instructions(status) WHERE status IN ('pending', 'fetched');
CREATE INDEX idx_copy_instructions_mapping ON public.copy_instructions(mapping_id);
CREATE INDEX idx_copy_instructions_expires ON public.copy_instructions(expires_at) WHERE status = 'pending';

CREATE INDEX idx_ea_connections_account ON public.ea_connections(account_id);
CREATE INDEX idx_ea_connections_active ON public.ea_connections(is_active) WHERE is_active = true;
CREATE INDEX idx_ea_connections_heartbeat ON public.ea_connections(last_heartbeat);

CREATE INDEX idx_trade_performance_date ON public.trade_performance_metrics(metric_date);
CREATE INDEX idx_trade_performance_account ON public.trade_performance_metrics(account_id);

CREATE INDEX idx_copy_performance_date ON public.copy_performance_metrics(metric_date);
CREATE INDEX idx_copy_performance_mapping ON public.copy_performance_metrics(mapping_id);

-- Function to clean up expired instructions
CREATE OR REPLACE FUNCTION public.cleanup_expired_instructions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.copy_instructions 
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate copy performance metrics
CREATE OR REPLACE FUNCTION public.calculate_copy_performance(
    p_mapping_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    v_total_signals INTEGER;
    v_executed_signals INTEGER;
    v_failed_signals INTEGER;
    v_avg_latency INTEGER;
    v_max_latency INTEGER;
    v_success_rate DECIMAL(5,2);
    v_total_volume DECIMAL(15,2);
BEGIN
    -- Get copy performance for the date
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE copy_status = 'success') as executed,
        COUNT(*) FILTER (WHERE copy_status = 'failed') as failed,
        COALESCE(AVG(EXTRACT(EPOCH FROM (copied_at - created_at)) * 1000), 0) as avg_latency,
        COALESCE(MAX(EXTRACT(EPOCH FROM (copied_at - created_at)) * 1000), 0) as max_latency,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE copy_status = 'success')::DECIMAL / COUNT(*) * 100)
            ELSE 0 
        END as success_rate,
        COALESCE(SUM(st.lot_size), 0) as total_volume
    INTO 
        v_total_signals, v_executed_signals, v_failed_signals, 
        v_avg_latency, v_max_latency, v_success_rate, v_total_volume
    FROM public.copied_trades ct
    LEFT JOIN public.trades st ON st.id = ct.slave_trade_id
    WHERE ct.mapping_id = p_mapping_id
    AND DATE(ct.created_at) = p_date;

    -- Insert or update metrics
    INSERT INTO public.copy_performance_metrics (
        mapping_id, metric_date, total_signals, executed_signals, failed_signals,
        average_latency_ms, max_latency_ms, success_rate, total_volume_copied
    ) VALUES (
        p_mapping_id, p_date, v_total_signals, v_executed_signals, v_failed_signals,
        v_avg_latency, v_max_latency, v_success_rate, v_total_volume
    )
    ON CONFLICT (mapping_id, metric_date) DO UPDATE SET
        total_signals = EXCLUDED.total_signals,
        executed_signals = EXCLUDED.executed_signals,
        failed_signals = EXCLUDED.failed_signals,
        average_latency_ms = EXCLUDED.average_latency_ms,
        max_latency_ms = EXCLUDED.max_latency_ms,
        success_rate = EXCLUDED.success_rate,
        total_volume_copied = EXCLUDED.total_volume_copied;
END;
$$ LANGUAGE plpgsql;

-- Function to update trade performance metrics
CREATE OR REPLACE FUNCTION public.calculate_trade_performance(
    p_account_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    v_metrics RECORD;
BEGIN
    -- Calculate trade performance metrics
    SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE profit_loss > 0) as winning_trades,
        COUNT(*) FILTER (WHERE profit_loss < 0) as losing_trades,
        COALESCE(SUM(lot_size), 0) as total_volume,
        COALESCE(SUM(profit_loss) FILTER (WHERE profit_loss > 0), 0) as gross_profit,
        COALESCE(ABS(SUM(profit_loss)) FILTER (WHERE profit_loss < 0), 0) as gross_loss,
        COALESCE(SUM(profit_loss), 0) as net_profit,
        COALESCE(AVG(profit_loss) FILTER (WHERE profit_loss > 0), 0) as average_win,
        COALESCE(AVG(profit_loss) FILTER (WHERE profit_loss < 0), 0) as average_loss,
        COALESCE(MAX(profit_loss), 0) as largest_win,
        COALESCE(MIN(profit_loss), 0) as largest_loss
    INTO v_metrics
    FROM public.trades
    WHERE account_id = p_account_id
    AND DATE(closed_at) = p_date
    AND status = 'closed';

    -- Calculate profit factor
    DECLARE
        v_profit_factor DECIMAL(10,4) := 0;
    BEGIN
        IF v_metrics.gross_loss > 0 THEN
            v_profit_factor := v_metrics.gross_profit / v_metrics.gross_loss;
        END IF;
    END;

    -- Insert or update metrics
    INSERT INTO public.trade_performance_metrics (
        account_id, metric_date, total_trades, winning_trades, losing_trades,
        total_volume, gross_profit, gross_loss, net_profit,
        average_win, average_loss, largest_win, largest_loss, profit_factor
    ) VALUES (
        p_account_id, p_date, v_metrics.total_trades, v_metrics.winning_trades, v_metrics.losing_trades,
        v_metrics.total_volume, v_metrics.gross_profit, v_metrics.gross_loss, v_metrics.net_profit,
        v_metrics.average_win, v_metrics.average_loss, v_metrics.largest_win, v_metrics.largest_loss, v_profit_factor
    )
    ON CONFLICT (account_id, metric_date) DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        winning_trades = EXCLUDED.winning_trades,
        losing_trades = EXCLUDED.losing_trades,
        total_volume = EXCLUDED.total_volume,
        gross_profit = EXCLUDED.gross_profit,
        gross_loss = EXCLUDED.gross_loss,
        net_profit = EXCLUDED.net_profit,
        average_win = EXCLUDED.average_win,
        average_loss = EXCLUDED.average_loss,
        largest_win = EXCLUDED.largest_win,
        largest_loss = EXCLUDED.largest_loss,
        profit_factor = EXCLUDED.profit_factor;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate performance metrics when trades are closed
CREATE OR REPLACE FUNCTION public.trigger_calculate_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when trade is closed
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        PERFORM public.calculate_trade_performance(NEW.account_id, DATE(NEW.closed_at));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trades_performance_trigger
    AFTER UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_performance();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copy_instructions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ea_connections TO authenticated;
GRANT SELECT ON public.trade_performance_metrics TO authenticated;
GRANT SELECT ON public.copy_performance_metrics TO authenticated;