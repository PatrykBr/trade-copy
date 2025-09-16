"use client";
import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';

interface SubscriptionFeatureLimits {
  maxAccounts: number | null; // -1 => unlimited, null => unknown
  maxCopyMappings: number | null; // -1 => unlimited, null => unknown
  accountsUsed: number;
  mappingsUsed: number;
  remainingAccounts: number | null; // null when unlimited/unknown
  remainingCopyMappings: number | null; // null when unlimited/unknown
}

interface SubscriptionStatusFlags {
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | null;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  isIncomplete: boolean;
}

export interface CurrentSubscription extends SubscriptionFeatureLimits, SubscriptionStatusFlags {
  planName: string | null;
  planPrice: number | null;
  billingCycle: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

interface SubscriptionContextValue {
  subscription: CurrentSubscription | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subscription', {cache: 'no-store'});
      if (!res.ok) {
        throw new Error(`Failed to load subscription (${res.status})`);
      }
      const data = await res.json();
      // Expect shape { success: boolean, data: { ... } }
      if (!data?.success) {
        throw new Error(data?.error || 'Unknown subscription error');
      }
      const s = data.data;
      const maxAccounts = typeof s.maxAccounts === 'number' ? s.maxAccounts : s.max_accounts ?? null;
      const maxCopyMappings = typeof s.maxCopyMappings === 'number' ? s.maxCopyMappings : s.max_copy_mappings ?? null;
      const accountsUsed = s.accountsUsed ?? s.accounts_used ?? 0;
      const mappingsUsed = s.mappingsUsed ?? s.mappings_used ?? 0;
      const status: SubscriptionStatusFlags['status'] = s.status ?? null;
      const result: CurrentSubscription = {
        planName: s.planName ?? s.plan_name ?? null,
        planPrice: s.planPrice ?? s.plan_price ?? null,
        billingCycle: s.billingCycle ?? s.billing_cycle ?? null,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd ?? s.cancel_at_period_end ?? false,
        currentPeriodEnd: s.currentPeriodEnd ?? s.current_period_end ?? null,
        maxAccounts: maxAccounts === -1 ? null : maxAccounts, // treat -1 unlimited => null remaining semantics
        maxCopyMappings: maxCopyMappings === -1 ? null : maxCopyMappings,
        accountsUsed,
        mappingsUsed,
        remainingAccounts: maxAccounts === -1 || maxAccounts == null ? null : Math.max(0, maxAccounts - accountsUsed),
        remainingCopyMappings: maxCopyMappings === -1 || maxCopyMappings == null ? null : Math.max(0, maxCopyMappings - mappingsUsed),
        status,
        isActive: status === 'active',
        isPastDue: status === 'past_due',
        isCanceled: status === 'canceled',
        isIncomplete: status === 'incomplete'
      };
      setSubscription(result);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{subscription, loading, error, refresh: fetchSubscription}}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
