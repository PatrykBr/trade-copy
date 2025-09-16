"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';

interface CopyMapping {
  id: string;
  masterAccount: {
    id: string;
    accountNumber: string;
    accountName: string;
  };
  slaveAccount: {
    id: string;
    accountNumber: string;
    accountName: string;
  };
  lotScalingType: string;
  lotScalingValue: number;
  isActive: boolean;
  performance: {
    totalSignals: number;
    executedSignals: number;
    successRate: number;
    averageLatency: number;
  };
}

export function CopyMappingStatus() {
  const [mappings, setMappings] = useState<CopyMapping[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    loadCopyMappings();

    // Set up real-time subscription for copy performance updates
    const channel = supabase
      .channel('copy_performance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'copied_trades'
        },
        () => {
          loadCopyMappings();
        }
      )
      .subscribe();

    // Refresh every minute
    const refreshInterval = setInterval(loadCopyMappings, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [user]);

  const loadCopyMappings = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('copy_mappings')
        .select(`
          id, lot_scaling_type, lot_scaling_value, is_active,
          master_account:trading_accounts!master_account_id(id, account_number, account_name),
          slave_account:trading_accounts!slave_account_id(id, account_number, account_name),
          copy_performance_metrics(
            total_signals, executed_signals, success_rate, average_latency_ms
          )
        `)
        .eq('user_id', user.id);

      if (data) {
        const mappingsWithPerformance: CopyMapping[] = data.map(mapping => {
          const latestPerformance = mapping.copy_performance_metrics?.[0] || {
            total_signals: 0,
            executed_signals: 0,
            success_rate: 0,
            average_latency_ms: 0
          };

          // Handle the case where accounts might be arrays due to Supabase join
          const masterAccount = Array.isArray(mapping.master_account) 
            ? mapping.master_account[0] 
            : mapping.master_account;
          const slaveAccount = Array.isArray(mapping.slave_account)
            ? mapping.slave_account[0]
            : mapping.slave_account;

          return {
            id: mapping.id,
            masterAccount: {
              id: masterAccount.id,
              accountNumber: masterAccount.account_number,
              accountName: masterAccount.account_name
            },
            slaveAccount: {
              id: slaveAccount.id,
              accountNumber: slaveAccount.account_number,
              accountName: slaveAccount.account_name
            },
            lotScalingType: mapping.lot_scaling_type,
            lotScalingValue: mapping.lot_scaling_value,
            isActive: mapping.is_active,
            performance: {
              totalSignals: latestPerformance.total_signals,
              executedSignals: latestPerformance.executed_signals,
              successRate: latestPerformance.success_rate,
              averageLatency: latestPerformance.average_latency_ms
            }
          };
        });

        setMappings(mappingsWithPerformance);
      }
    } catch (error) {
      console.error('Error loading copy mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMappingStatus = async (mappingId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('copy_mappings')
        .update({ is_active: !currentStatus })
        .eq('id', mappingId);

      if (error) {
        console.error('Error updating mapping status:', error);
        return;
      }

      // Update local state
      setMappings(prev => prev.map(mapping => 
        mapping.id === mappingId 
          ? { ...mapping, isActive: !currentStatus }
          : mapping
      ));
    } catch (error) {
      console.error('Error toggling mapping status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800">
      <div className="p-4 border-b border-neutral-800">
        <h3 className="text-lg font-semibold text-white">Copy Mapping Status</h3>
        <p className="text-sm text-neutral-400">Performance and status of your copy mappings</p>
      </div>
      
      {mappings.length === 0 ? (
        <div className="p-8 text-center text-neutral-500">
          No copy mappings configured. Create copy mappings to start copying trades.
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {mappings.map((mapping) => (
            <div key={mapping.id} className="bg-neutral-800/50 rounded-lg p-4 space-y-3">
              {/* Mapping Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="text-white font-medium">
                      {mapping.masterAccount.accountName} → {mapping.slaveAccount.accountName}
                    </div>
                    <div className="text-sm text-neutral-400">
                      #{mapping.masterAccount.accountNumber} → #{mapping.slaveAccount.accountNumber}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {mapping.lotScalingType}: {mapping.lotScalingValue}
                    {mapping.lotScalingType === 'percentage' ? '%' : 'x'}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleMappingStatus(mapping.id, mapping.isActive)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      mapping.isActive
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    }`}
                  >
                    {mapping.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {mapping.performance.totalSignals}
                  </div>
                  <div className="text-xs text-neutral-400">Total Signals</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">
                    {mapping.performance.executedSignals}
                  </div>
                  <div className="text-xs text-neutral-400">Executed</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-400">
                    {mapping.performance.successRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-neutral-400">Success Rate</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-400">
                    {mapping.performance.averageLatency}ms
                  </div>
                  <div className="text-xs text-neutral-400">Avg Latency</div>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Execution Rate</span>
                  <span>
                    {mapping.performance.executedSignals}/{mapping.performance.totalSignals}
                  </span>
                </div>
                <div className="w-full bg-neutral-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${mapping.performance.totalSignals > 0 
                        ? (mapping.performance.executedSignals / mapping.performance.totalSignals) * 100 
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}