'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

interface PerformanceMetrics {
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export function PerformanceOverview() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPerformanceMetrics();
    }
  }, [user]);

  const fetchPerformanceMetrics = async () => {
    try {
      const supabase = createClient();
      
      // Get user's trading accounts
      const { data: accounts } = await supabase
        .from('trading_accounts')
        .select('id')
        .eq('user_id', user!.id);

      if (!accounts || accounts.length === 0) {
        setMetrics({
          totalPnL: 0,
          totalTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
        });
        setLoading(false);
        return;
      }

      const accountIds = accounts.map(acc => acc.id);

      // Get all closed trades for user's accounts
      const { data: trades, error } = await supabase
        .from('trades')
        .select('profit_loss, status')
        .in('account_id', accountIds)
        .eq('status', 'closed')
        .not('profit_loss', 'is', null);

      if (error) {
        console.error('Error fetching trades:', error);
        setLoading(false);
        return;
      }

      // Calculate metrics
      const totalTrades = trades?.length || 0;
      const totalPnL = trades?.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0) || 0;
      
      const winningTrades = trades?.filter(trade => (trade.profit_loss || 0) > 0) || [];
      const losingTrades = trades?.filter(trade => (trade.profit_loss || 0) < 0) || [];
      
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
      const avgWin = winningTrades.length > 0 
        ? winningTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0) / winningTrades.length 
        : 0;
      const avgLoss = losingTrades.length > 0 
        ? Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0) / losingTrades.length)
        : 0;
      
      const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;

      setMetrics({
        totalPnL,
        totalTrades,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
      });
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return <div>Loading performance metrics...</div>;
  }

  if (!metrics) {
    return <div>No performance data available yet.</div>;
  }

  return (
    <div>
      <h3>Performance Overview</h3>
      <ul>
        <li>Total P&L: {formatCurrency(metrics.totalPnL)}</li>
        <li>Total Trades: {metrics.totalTrades}</li>
        <li>Win Rate: {formatPercentage(metrics.winRate)}</li>
        <li>Average Win: {formatCurrency(metrics.avgWin)}</li>
        <li>Average Loss: {formatCurrency(metrics.avgLoss)}</li>
        <li>Profit Factor: {metrics.profitFactor.toFixed(2)}</li>
      </ul>
    </div>
  );
}