"use client";

import { useEffect, useState, useCallback } from 'react';
import type { TradingAccount, TradingPlatform } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Power, Edit2, Trash2 } from 'lucide-react';

interface TradingAccountListProps { className?: string; refreshSignal?: number }

export function TradingAccountList({ className, refreshSignal }: TradingAccountListProps) {
  const [accounts, setAccounts] = useState<(TradingAccount & { platform: TradingPlatform })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load accounts');
      }
      const json = await res.json();
      setAccounts(json.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const handleToggleActive = (id: string) => console.log('Toggle active', id);
  const handleEdit = (id: string) => console.log('Edit', id);
  const handleDelete = (id: string) => console.log('Delete', id);

  const statusBadge = (isActive: boolean, lastSync?: string) => {
    if (!isActive) return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">INACTIVE</span>;
    if (!lastSync) return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">UNKNOWN</span>;
    const lastSyncTime = new Date(lastSync).getTime();
    const diffMinutes = (Date.now() - lastSyncTime) / 60000;
    if (diffMinutes < 5) return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">OK</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30">STALE</span>;
  };

  if (loading) {
    return <div className="text-sm text-neutral-400 py-6">Loading accounts…</div>;
  }
  if (error) {
    return <div className="text-sm text-red-400 py-6 flex items-center gap-3">
      <span>{error}</span>
      <button onClick={load} className="text-xs underline">Retry</button>
    </div>;
  }
  if (accounts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-neutral-400">No trading accounts connected yet.</p>
        <Button variant="gradient" size="sm" className="mt-4">Add Trading Account</Button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
      {accounts.map(acc => (
        <Card key={acc.id} variant="outline" className="p-0 overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-neutral-100 text-sm leading-tight truncate max-w-[180px]">{acc.account_name}</h3>
                  {statusBadge(acc.is_active, acc.last_sync_at)}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">{acc.platform.name} #{acc.account_number} • {acc.account_type}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggleActive(acc.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-neutral-800/60 border border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:border-neutral-600">
                  <Power size={14} />
                </button>
                <button onClick={() => handleEdit(acc.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-neutral-800/60 border border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:border-neutral-600">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(acc.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-neutral-800/60 border border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:border-neutral-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-neutral-500">Balance</div>
                <div className="text-neutral-200 font-medium">{formatCurrency(acc.balance || 0, acc.currency)}</div>
              </div>
              <div>
                <div className="text-neutral-500">Equity</div>
                <div className="text-neutral-200 font-medium">{formatCurrency(acc.equity || 0, acc.currency)}</div>
              </div>
              <div>
                <div className="text-neutral-500">Margin</div>
                <div className="text-neutral-200 font-medium">{formatCurrency(acc.margin || 0, acc.currency)}</div>
              </div>
              <div>
                <div className="text-neutral-500">Free Margin</div>
                <div className="text-neutral-200 font-medium">{formatCurrency(acc.free_margin || 0, acc.currency)}</div>
              </div>
            </div>
            <div className="text-[11px] text-neutral-500">Last sync: {acc.last_sync_at ? formatDateTime(acc.last_sync_at) : '—'}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}