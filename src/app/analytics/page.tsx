"use client";

import { ProtectedRoute } from '@/components/auth/protected-route';
import { PerformanceOverview } from '@/components/analytics/performance-overview';
import { TradeHistory } from '@/components/analytics/trade-history';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

interface FilterState {
  range: string;
  account: string;
  symbol: string;
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<FilterState>({ range: '30d', account: 'all', symbol: 'all' });

  return (
    <ProtectedRoute>
      <div className="container-page py-10 space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-100">Analytics</h1>
            <p className="text-sm text-neutral-500 mt-1">Performance metrics, trade distribution & historical context.</p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="sm" variant="outline"><Link href="/accounts">Accounts</Link></Button>
          </div>
        </div>

        {/* Filters */}
        <Card variant="outline">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
              <div className="grid sm:grid-cols-3 gap-4 flex-1">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">Range</label>
                  <select value={filters.range} onChange={e => setFilters(f => ({ ...f, range: e.target.value }))} className="h-9 px-3 rounded-md bg-neutral-800/60 border border-neutral-700 text-sm text-neutral-100 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none">
                    <option value="7d">Last 7d</option>
                    <option value="30d">Last 30d</option>
                    <option value="90d">Last 90d</option>
                    <option value="ytd">YTD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">Account</label>
                  <select value={filters.account} onChange={e => setFilters(f => ({ ...f, account: e.target.value }))} className="h-9 px-3 rounded-md bg-neutral-800/60 border border-neutral-700 text-sm text-neutral-100 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none">
                    <option value="all">All Accounts</option>
                    <option value="master">Master Accounts</option>
                    <option value="slave">Slave Accounts</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">Symbol</label>
                  <select value={filters.symbol} onChange={e => setFilters(f => ({ ...f, symbol: e.target.value }))} className="h-9 px-3 rounded-md bg-neutral-800/60 border border-neutral-700 text-sm text-neutral-100 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none">
                    <option value="all">All Symbols</option>
                    <option value="EURUSD">EURUSD</option>
                    <option value="XAUUSD">XAUUSD</option>
                    <option value="GBPUSD">GBPUSD</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setFilters({ range: '30d', account: 'all', symbol: 'all' })}>Reset</Button>
                <Button size="sm" variant="gradient">Apply</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance + Equity Curve */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card variant="outline" className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Performance Overview</CardTitle>
              <CardDescription className="text-xs">Aggregate metrics</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <PerformanceOverview />
            </CardContent>
          </Card>
          <Card variant="outline" className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
              <CardDescription className="text-xs">Cumulative P&L over selected range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full flex items-center justify-center text-xs text-neutral-500 border border-dashed border-neutral-700 rounded-md">
                (Chart placeholder)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution & Stats */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card variant="outline" className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Return Distribution</CardTitle>
              <CardDescription className="text-xs">Histogram of trade outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-xs text-neutral-500 border border-dashed border-neutral-700 rounded-md">(Histogram)</div>
            </CardContent>
          </Card>
          <Card variant="outline" className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Symbol Performance</CardTitle>
              <CardDescription className="text-xs">PnL & win rate by symbol</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-xs text-neutral-500 border border-dashed border-neutral-700 rounded-md">(Symbols table)</div>
            </CardContent>
          </Card>
        </div>

        {/* Trades */}
        <Card variant="outline">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
            <CardDescription className="text-xs">Latest {filters.range} executions</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <TradeHistory limit={20} />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}