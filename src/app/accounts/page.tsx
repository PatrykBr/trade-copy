"use client";

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { TradingAccountForm } from '@/components/trading/trading-account-form';
import { TradingAccountList } from '@/components/trading/trading-account-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, Zap, ShieldCheck, Plus } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription-context';
import { LimitBanner } from '@/components/subscription/limit-banner';

export default function AccountsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const { subscription } = useSubscription();
  const accountLimitReached = !!subscription && subscription.remainingAccounts === 0;

  const handleAccountAdded = () => {
    setShowAddForm(false);
    setRefreshTick(t => t + 1); // trigger list reload
  };

  const metrics = [
    { label: 'Total Accounts', value: '—', sub: 'Live metrics TBD', icon: Layers },
    { label: 'Active Mappings', value: '—', sub: 'Replication TBD', icon: Zap },
    { label: 'Protection Rules', value: '—', sub: 'Risk controls TBD', icon: ShieldCheck },
  ];

  return (
    <ProtectedRoute>
      <div className="container-page py-10 space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-100">Trading Accounts</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage connectivity, status and replication roles.</p>
          </div>
          <div className="flex gap-3">
            <Button
              size="sm"
              variant={showAddForm ? 'outline' : 'gradient'}
              onClick={() => setShowAddForm(s => !s)}
              disabled={accountLimitReached}
            >
              <Plus size={14} className="mr-2" /> {accountLimitReached ? 'Limit Reached' : showAddForm ? 'Close Form' : 'Add Account'}
            </Button>
          </div>
        </div>

        <LimitBanner className="mt-2" variant="accounts" />

        {/* Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {metrics.map(m => (
            <Card key={m.label} variant="glow" className="p-0 overflow-hidden">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 text-cyan-300">
                  <m.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">{m.label}</div>
                  <div className="text-lg font-semibold text-neutral-100 leading-none">{m.value}</div>
                  <div className="text-[11px] text-neutral-500 mt-1 truncate">{m.sub}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form */}
        {showAddForm && !accountLimitReached && (
          <Card variant="outline">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Add Trading Account</CardTitle>
              <CardDescription className="text-xs">Connect a new master or slave account</CardDescription>
            </CardHeader>
            <CardContent>
              <TradingAccountForm onSuccess={handleAccountAdded} onCancel={() => setShowAddForm(false)} />
            </CardContent>
          </Card>
        )}
        {showAddForm && accountLimitReached && (
          <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-md px-4 py-3">
            You have reached the maximum number of accounts for your current plan. <button className="underline" onClick={() => (window.location.href='/#pricing')}>Upgrade your plan</button> to add more.
          </div>
        )}

        {/* Account List */}
        <Card variant="outline">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <CardDescription className="text-xs">Connection status & balances</CardDescription>
          </CardHeader>
          <CardContent>
            <TradingAccountList refreshSignal={refreshTick} />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}