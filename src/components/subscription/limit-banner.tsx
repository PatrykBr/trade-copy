"use client";
import React from 'react';
import { useSubscription } from '@/contexts/subscription-context';

interface LimitBannerProps {
  className?: string;
  variant?: 'accounts' | 'mappings' | 'both';
}

export const LimitBanner: React.FC<LimitBannerProps> = ({ className, variant = 'both' }) => {
  const { subscription, loading } = useSubscription();
  if (loading || !subscription) return null;

  const items: { label: string; used: number; max: number | null; remaining: number | null; key: string }[] = [];
  if (variant === 'accounts' || variant === 'both') {
    items.push({
      label: 'Accounts',
      used: subscription.accountsUsed,
      max: subscription.maxAccounts,
      remaining: subscription.remainingAccounts,
      key: 'accounts'
    });
  }
  if (variant === 'mappings' || variant === 'both') {
    items.push({
      label: 'Copy Mappings',
      used: subscription.mappingsUsed,
      max: subscription.maxCopyMappings,
      remaining: subscription.remainingCopyMappings,
      key: 'mappings'
    });
  }

  const show = items.some(i => typeof i.max === 'number');
  if (!show) return null;

  return (
    <div className={"rounded-md border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent px-4 py-3 text-xs flex flex-wrap gap-4 items-center " + (className || '')}>
      <div className="font-medium text-neutral-200 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        Usage
      </div>
      {items.map(i => (
        <div key={i.key} className="flex items-center gap-1 text-neutral-300">
          <span className="text-neutral-500">{i.label}:</span>
          <span className="font-semibold">{i.used}</span>
          <span className="text-neutral-500">/ {typeof i.max === 'number' ? i.max : '∞'}</span>
          {typeof i.remaining === 'number' && i.remaining <= 1 && (
            <span className={"ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium " + (i.remaining === 0 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300')}>
              {i.remaining === 0 ? 'LIMIT REACHED' : 'LOW' }
            </span>
          )}
        </div>
      ))}
      {(subscription.remainingAccounts === 0 || subscription.remainingCopyMappings === 0) && (
        <button
          type="button"
          onClick={() => (window.location.href = '/#pricing')}
          className="ml-auto text-cyan-300 hover:text-cyan-200 underline decoration-dotted"
        >
          Upgrade Plan
        </button>
      )}
    </div>
  );
};