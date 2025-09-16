'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  open_price: number;
  close_price: number | null;
  profit_loss: number | null;
  status: 'open' | 'closed' | 'cancelled';
  opened_at: string;
  closed_at: string | null;
  account: {
    account_name: string;
    platform: {
      name: string;
    };
  };
}

interface TradeHistoryProps {
  limit?: number;
}

export function TradeHistory({ limit = 10 }: TradeHistoryProps) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user, limit]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trades?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }
      const result = await response.json();
      setTrades(result.data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const statusText = (status: string) => status;

  if (loading) return <div>Loading trade history...</div>;

  return (
    <div>
      <h3>Trade History {trades.length === limit && `(showing latest ${limit})`}</h3>
      {trades.length === 0 ? (
        <div>No trades found.</div>
      ) : (
        <ul>
          {trades.map((trade) => (
            <li key={trade.id}>
              {trade.symbol} {trade.trade_type.toUpperCase()} {trade.lot_size} @ {trade.open_price}
              {trade.close_price && ` -> ${trade.close_price}`}
              {' '}| PnL: {trade.profit_loss !== null ? formatCurrency(trade.profit_loss) : '-'}
              {' '}| Status: {statusText(trade.status)}
              {' '}| {trade.account.account_name} ({trade.account.platform?.name})
              {' '}| Opened: {formatDate(trade.opened_at)}
              {trade.closed_at && ` Closed: ${formatDate(trade.closed_at)}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}