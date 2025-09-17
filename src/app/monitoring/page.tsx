import { Metadata } from 'next';
import { VPSMonitoringDashboard } from '@/components/monitoring/vps-monitoring-dashboard';

export const metadata: Metadata = {
  title: 'VPS Monitoring - TradeCopy Pro',
  description: 'Real-time monitoring of VPS infrastructure and trade execution performance',
};

export default function VPSMonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">VPS Infrastructure Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Real-time monitoring of trade execution latency, VPS health, and system performance
        </p>
      </div>
      
      <VPSMonitoringDashboard />
    </div>
  );
}