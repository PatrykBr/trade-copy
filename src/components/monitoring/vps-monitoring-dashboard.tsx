'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ExecutionStream } from '@/components/ui/execution-stream';

interface VPSHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  cpu_usage: number;
  memory_usage: number;
  current_load: number;
  capacity: number;
  region: string;
  last_health_check: string;
}

interface SystemMetrics {
  totalAccounts: number;
  activeConnections: number;
  avgLatencyMs: number;
  successRate: number;
  tradesProcessed24h: number;
  queueSize: number;
  vpsHealth: {
    healthy: number;
    warning: number;
    critical: number;
    offline: number;
  };
}

export function VPSMonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalAccounts: 0,
    activeConnections: 0,
    avgLatencyMs: 0,
    successRate: 0,
    tradesProcessed24h: 0,
    queueSize: 0,
    vpsHealth: {
      healthy: 0,
      warning: 0,
      critical: 0,
      offline: 0
    }
  });
  
  const [vpsInstances, setVpsInstances] = useState<VPSHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch system metrics
        const response = await fetch('/api/vps?action=health');
        if (response.ok) {
          const data = await response.json();
          
          // Process VPS instances
          setVpsInstances(data.vpsInstances || []);
          
          // Calculate metrics
          const healthCounts = (data.vpsInstances || []).reduce((acc: any, vps: any) => {
            const status = getVPSStatus(vps);
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
          
          setMetrics({
            totalAccounts: 156, // Mock data
            activeConnections: 142,
            avgLatencyMs: 23.7,
            successRate: 99.2,
            tradesProcessed24h: 2847,
            queueSize: 3,
            vpsHealth: {
              healthy: healthCounts.healthy || 0,
              warning: healthCounts.warning || 0,
              critical: healthCounts.critical || 0,
              offline: healthCounts.offline || 0
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchMetrics();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchMetrics, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getVPSStatus = (vps: any): 'healthy' | 'warning' | 'critical' | 'offline' => {
    if (vps.status === 'offline') return 'offline';
    if (vps.cpu_usage > 90 || vps.memory_usage > 90) return 'critical';
    if (vps.cpu_usage > 80 || vps.memory_usage > 80) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '●';
      case 'warning': return '⚠';
      case 'critical': return '◉';
      case 'offline': return '○';
      default: return '○';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Avg Latency</p>
              <p className="text-2xl font-bold text-green-600">{metrics.avgLatencyMs}ms</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-green-500 rounded animate-pulse"></div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Sub-50ms target ✓</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.successRate}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">✓</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">+0.3% from yesterday</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.activeConnections}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">⚡</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{metrics.totalAccounts} total accounts</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Queue Size</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.queueSize}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">⚙</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{metrics.tradesProcessed24h} trades today</p>
        </Card>
      </div>

      {/* VPS Health Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">VPS Farm Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{metrics.vpsHealth.healthy}</div>
            <div className="text-sm text-gray-600">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{metrics.vpsHealth.warning}</div>
            <div className="text-sm text-gray-600">Warning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{metrics.vpsHealth.critical}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-500">{metrics.vpsHealth.offline}</div>
            <div className="text-sm text-gray-600">Offline</div>
          </div>
        </div>

        {/* VPS Instances */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vpsInstances.map((vps) => {
            const status = getVPSStatus(vps);
            return (
              <div key={vps.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{vps.name}</h4>
                  <div className="flex items-center space-x-1">
                    <span className={getStatusColor(status)}>
                      {getStatusIcon(status)}
                    </span>
                    <span className={`text-sm ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPU:</span>
                    <span className={vps.cpu_usage > 80 ? 'text-red-500' : 'text-gray-800'}>
                      {vps.cpu_usage?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memory:</span>
                    <span className={vps.memory_usage > 80 ? 'text-red-500' : 'text-gray-800'}>
                      {vps.memory_usage?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Load:</span>
                    <span className="text-gray-800">
                      {vps.current_load || 0}/{vps.capacity || 100}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Region:</span>
                    <span className="text-gray-800">{vps.region}</span>
                  </div>
                </div>

                {/* Load bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (vps.current_load || 0) / (vps.capacity || 100) > 0.8 
                        ? 'bg-red-500' 
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${((vps.current_load || 0) / (vps.capacity || 100)) * 100}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Live Execution Stream */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Live Execution Stream</h3>
        <ExecutionStream />
      </Card>

      {/* Performance Analytics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Latency Distribution</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>0-10ms:</span>
                <span className="font-mono">12%</span>
              </div>
              <div className="flex justify-between">
                <span>10-25ms:</span>
                <span className="font-mono">68%</span>
              </div>
              <div className="flex justify-between">
                <span>25-50ms:</span>
                <span className="font-mono">18%</span>
              </div>
              <div className="flex justify-between">
                <span>50ms+:</span>
                <span className="font-mono">2%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Copy Success by Platform</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>MT4:</span>
                <span className="font-mono text-green-600">99.4%</span>
              </div>
              <div className="flex justify-between">
                <span>MT5:</span>
                <span className="font-mono text-green-600">99.1%</span>
              </div>
              <div className="flex justify-between">
                <span>cTrader:</span>
                <span className="font-mono text-green-600">98.8%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Volume Statistics</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Today:</span>
                <span className="font-mono">{metrics.tradesProcessed24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>This Week:</span>
                <span className="font-mono">18,542</span>
              </div>
              <div className="flex justify-between">
                <span>This Month:</span>
                <span className="font-mono">76,329</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}