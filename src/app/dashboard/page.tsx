"use client";

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { PerformanceOverview } from '@/components/analytics/performance-overview';
import { TradeHistory } from '@/components/analytics/trade-history';
import { SubscriptionCard } from '@/components/subscription/subscription-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Zap, ShieldCheck, Plus, Layers, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';
function MetricCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string; sub?: string; icon: LucideIcon; trend?: string }) {
  return (
    <Card variant="glow" className="p-0 overflow-hidden">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 text-cyan-300">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">{label}</div>
          <div className="text-lg font-semibold text-neutral-100 leading-none">{value}</div>
          {sub && <div className="text-[11px] text-neutral-500 mt-1 truncate">{sub}</div>}
        </div>
        {trend && <div className={cn("text-xs font-medium", trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400')}>{trend}</div>}
      </CardContent>
    </Card>
  );
}

function RecentActivity() {
  const items = [
    { id: 1, icon: Activity, text: 'Copied EURUSD 1.00 lot BUY to Slave #2', time: '2m', tone: 'ok' },
    { id: 2, icon: Zap, text: 'Latency spike normalized (42ms → 27ms)', time: '17m', tone: 'ok' },
    { id: 3, icon: ShieldCheck, text: 'Drawdown guard armed on Master #1', time: '1h', tone: 'warn' },
  ];
  return (
    <Card variant="outline" className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        <CardDescription className="text-xs">Live operational events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="mt-0.5 h-7 w-7 rounded-md flex items-center justify-center bg-neutral-800/60 text-neutral-400 border border-neutral-700">
              <item.icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-neutral-300 truncate">{item.text}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">{item.time} ago</div>
            </div>
          </div>
        ))}
        <Button variant="ghost" className="w-full justify-center text-xs mt-1 h-8" asChild>
          <Link href="#">View full log</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Add Account', href: '/accounts', icon: Plus },
    { label: 'New Mapping', href: '/accounts', icon: Layers },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];
  return (
    <Card variant="outline" className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        <CardDescription className="text-xs">Common operations</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map(a => (
          <Button key={a.label} asChild variant="outline" className="justify-start h-9 text-sm">
            <Link href={a.href}>
              <a.icon size={14} className="mr-2" /> {a.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function DashboardInner() {
  const { profile } = useAuth();
  return (
    <div className="container-page py-10 space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-100">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. Your replication overview.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild size="sm" variant="gradient"><Link href="/accounts">Add Account</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/accounts">New Mapping</Link></Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard label="Total P&L" value="+$2,847" sub="Across all closed trades" icon={Activity} trend="+4.2%" />
        <MetricCard label="Daily P&L" value="+$156" sub="Today" icon={Zap} trend="+1.1%" />
        <MetricCard label="Active Mappings" value="2" sub="4 total accounts" icon={Layers} />
        <MetricCard label="Win Rate" value="62%" sub="Last 30 days" icon={ShieldCheck} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card variant="outline">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <CardDescription className="text-xs">Aggregate account metrics</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <PerformanceOverview />
            </CardContent>
          </Card>
          <Card variant="outline">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
              <CardDescription className="text-xs">Latest executions</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <TradeHistory limit={8} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <RecentActivity />
          <Card variant="outline">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <CardDescription className="text-xs">Plan & usage limits</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <SubscriptionCard />
            </CardContent>
          </Card>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardInner />
    </ProtectedRoute>
  );
}