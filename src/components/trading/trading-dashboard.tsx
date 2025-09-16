"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import type { TradingAccount } from '@/types';

interface ConnectionStatus {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  platform: string;
  accountType: 'master' | 'slave';
  isActive: boolean;
  lastHeartbeat: string;
  connectionTime: string;
  latencyMs: number;
  status: 'connected' | 'disconnected' | 'error';
}

interface TradeSignal {
  id: string;
  accountId: string;
  accountNumber: string;
  symbol: string;
  tradeType: 'buy' | 'sell';
  lotSize: number;
  price: number;
  timestamp: string;
  type: 'opened' | 'closed' | 'modified';
}

export function TradingDashboard() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [recentSignals, setRecentSignals] = useState<TradeSignal[]>([]);
  const [stats, setStats] = useState({
    totalConnections: 0,
    masterAccounts: 0,
    slaveAccounts: 0,
    averageLatency: 0,
    tradesPerMinute: 0
  });
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    // Load initial data
    loadConnectionStatuses();
    loadRecentSignals();

    // Set up real-time subscriptions
    const connectionsChannel = supabase
      .channel('ea_connections')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ea_connections',
          filter: `account_id=in.(${user.id})`
        },
        (payload) => {
          handleConnectionUpdate(payload);
        }
      )
      .subscribe();

    const tradesChannel = supabase
      .channel('trades')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          handleTradeUpdate(payload);
        }
      )
      .subscribe();

    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      loadConnectionStatuses();
      loadRecentSignals();
    }, 30000);

    return () => {
      supabase.removeChannel(connectionsChannel);
      supabase.removeChannel(tradesChannel);
      clearInterval(refreshInterval);
    };
  }, [user]);

  const loadConnectionStatuses = async () => {
    if (!user) return;

    try {
      const { data: accounts } = await supabase
        .from('trading_accounts')
        .select(`
          id, account_number, account_name, account_type, platform_id,
          platform:trading_platforms(name, code),
          ea_connections!inner(
            id, connection_type, platform, last_heartbeat, 
            connection_time, is_active, latency_ms
          )
        `)
        .eq('user_id', user.id);

      if (accounts) {
        const connectionStatuses: ConnectionStatus[] = accounts
          .filter(account => account.ea_connections && account.ea_connections.length > 0)
          .map(account => {
            const connection = account.ea_connections[0]; // Get most recent connection
            const lastHeartbeat = new Date(connection.last_heartbeat);
            const now = new Date();
            const timeDiff = now.getTime() - lastHeartbeat.getTime();
            const isConnected = timeDiff < 60000; // Consider disconnected if no heartbeat for 1 minute

            return {
              id: connection.id,
              accountId: account.id,
              accountNumber: account.account_number,
              accountName: account.account_name,
              platform: connection.platform,
              accountType: account.account_type,
              isActive: connection.is_active && isConnected,
              lastHeartbeat: connection.last_heartbeat,
              connectionTime: connection.connection_time,
              latencyMs: connection.latency_ms || 0,
              status: isConnected ? 'connected' : 'disconnected'
            };
          });

        setConnections(connectionStatuses);

        // Calculate stats
        const totalConnections = connectionStatuses.length;
        const activeConnections = connectionStatuses.filter(c => c.isActive);
        const masterAccounts = activeConnections.filter(c => c.accountType === 'master').length;
        const slaveAccounts = activeConnections.filter(c => c.accountType === 'slave').length;
        const averageLatency = activeConnections.length > 0 
          ? Math.round(activeConnections.reduce((sum, c) => sum + c.latencyMs, 0) / activeConnections.length)
          : 0;

        setStats({
          totalConnections,
          masterAccounts,
          slaveAccounts,
          averageLatency,
          tradesPerMinute: 0 // Will be calculated from recent signals
        });
      }
    } catch (error) {
      console.error('Error loading connection statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSignals = async () => {
    if (!user) return;

    try {
      const { data: trades } = await supabase
        .from('trades')
        .select(`
          id, platform_trade_id, symbol, trade_type, lot_size, 
          open_price, close_price, status, opened_at, closed_at,
          account:trading_accounts!inner(id, account_number, account_name, user_id)
        `)
        .eq('account.user_id', user.id)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false })
        .limit(20);

      if (trades) {
        const signals: TradeSignal[] = trades.map(trade => {
          // Handle the case where account might be an array due to Supabase join
          const account = Array.isArray(trade.account) ? trade.account[0] : trade.account;
          
          return {
            id: trade.id,
            accountId: account.id,
            accountNumber: account.account_number,
            symbol: trade.symbol,
            tradeType: trade.trade_type,
            lotSize: trade.lot_size,
            price: trade.status === 'closed' ? trade.close_price : trade.open_price,
            timestamp: trade.status === 'closed' ? trade.closed_at : trade.opened_at,
            type: trade.status === 'closed' ? 'closed' : 'opened'
          };
        });

        setRecentSignals(signals);

        // Calculate trades per minute
        const recentTrades = signals.filter(s => 
          new Date(s.timestamp).getTime() > Date.now() - 60000 // Last minute
        );
        setStats(prev => ({ ...prev, tradesPerMinute: recentTrades.length }));
      }
    } catch (error) {
      console.error('Error loading recent signals:', error);
    }
  };

  const handleConnectionUpdate = (payload: any) => {
    // Update connection status in real-time
    loadConnectionStatuses();
  };

  const handleTradeUpdate = (payload: any) => {
    // Add new trade signal to the list
    loadRecentSignals();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'disconnected': return 'text-red-400';
      case 'error': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      case 'error': return '🟡';
      default: return '⚫';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div className="text-sm text-neutral-400">Total Connections</div>
          <div className="text-2xl font-bold text-white">{stats.totalConnections}</div>
        </div>
        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div className="text-sm text-neutral-400">Master Accounts</div>
          <div className="text-2xl font-bold text-green-400">{stats.masterAccounts}</div>
        </div>
        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div className="text-sm text-neutral-400">Slave Accounts</div>
          <div className="text-2xl font-bold text-blue-400">{stats.slaveAccounts}</div>
        </div>
        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div className="text-sm text-neutral-400">Avg Latency</div>
          <div className="text-2xl font-bold text-cyan-400">{stats.averageLatency}ms</div>
        </div>
        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div className="text-sm text-neutral-400">Trades/Min</div>
          <div className="text-2xl font-bold text-purple-400">{stats.tradesPerMinute}</div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-neutral-900 rounded-lg border border-neutral-800">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">EA Connections</h3>
          <p className="text-sm text-neutral-400">Real-time status of Expert Advisor connections</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-neutral-800">
              <tr className="text-left">
                <th className="p-4 text-sm font-medium text-neutral-400">Account</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Platform</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Latency</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody>
              {connections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-500">
                    No EA connections found. Make sure your Expert Advisors are running and configured.
                  </td>
                </tr>
              ) : (
                connections.map((connection) => (
                  <tr key={connection.id} className="border-b border-neutral-800/50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-white">{connection.accountName}</div>
                        <div className="text-sm text-neutral-400">#{connection.accountNumber}</div>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-300">{connection.platform}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        connection.accountType === 'master' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {connection.accountType}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span>{getStatusIcon(connection.status)}</span>
                        <span className={`text-sm font-medium ${getStatusColor(connection.status)}`}>
                          {connection.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-300">{connection.latencyMs}ms</td>
                    <td className="p-4 text-neutral-400 text-sm">
                      {new Date(connection.lastHeartbeat).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Trade Signals */}
      <div className="bg-neutral-900 rounded-lg border border-neutral-800">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">Recent Trade Signals</h3>
          <p className="text-sm text-neutral-400">Live feed of trade executions from your accounts</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recentSignals.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No recent trade signals. Trades will appear here as they are executed.
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {recentSignals.map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${
                      signal.type === 'opened' ? 'bg-green-400' : 
                      signal.type === 'closed' ? 'bg-red-400' : 'bg-yellow-400'
                    }`}></div>
                    <div>
                      <div className="text-white font-medium">
                        {signal.symbol} {signal.tradeType.toUpperCase()}
                      </div>
                      <div className="text-sm text-neutral-400">
                        Account: {signal.accountNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{signal.lotSize} lots</div>
                    <div className="text-sm text-neutral-400">
                      {new Date(signal.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}