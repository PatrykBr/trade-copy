"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/contexts/subscription-context';
import type { TradingAccountForm as TradingAccountFormType } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface TradingAccountFormProps {
  className?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Lightweight UUID validation (same pattern as API)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_REGEX.test(v);

export function TradingAccountForm({ className, onSuccess, onCancel }: TradingAccountFormProps) {
  const [formData, setFormData] = useState<TradingAccountFormType>({
    platform_id: '',
    account_name: '',
    account_number: '',
    account_type: 'slave',
    currency: 'USD',
    server: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platforms, setPlatforms] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);

  const { user } = useAuth();
  const { subscription, refresh: subscriptionContextRefresh } = useSubscription();

  const limitReached = useMemo(() => {
    if (!subscription) return false; // still loading
    if (!subscription.isActive && !subscription.isPastDue) return true; // block if canceled/incomplete
    if (subscription.remainingAccounts === 0) return true;
    return false;
  }, [subscription]);

  const disabledReason = useMemo(() => {
    if (!subscription) return null;
    if (subscription.isCanceled) return 'Subscription canceled — renew to add accounts.';
    if (subscription.isIncomplete) return 'Subscription incomplete — finish checkout to add accounts.';
    if (subscription.isPastDue) return 'Payment past due — resolve billing to add new accounts.';
    if (subscription.remainingAccounts === 0) return 'Account limit reached for current plan.';
    return null;
  }, [subscription]);

  // Fetch platforms dynamically
  useEffect(() => {
    let active = true;
    (async () => {
      setPlatformsLoading(true);
      try {
        const res = await fetch('/api/platforms');
        if (!res.ok) throw new Error('PLATFORMS_FETCH');
        const json = await res.json();
        if (active && Array.isArray(json?.data)) {
          setPlatforms(json.data);
        }
      } catch (e) {
        setError('Could not load trading platforms. Retry or contact support.');
      } finally {
        if (active) setPlatformsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const platformSelected = formData.platform_id && platforms.some(p => p.id === formData.platform_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (!platformSelected) {
        setError('Select a valid platform before submitting.');
        setLoading(false);
        return;
      }
      const payload = { ...formData };
      const response = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const maybeJson = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = maybeJson?.code;
        const msg = maybeJson?.error || '';
        if (code === 'ACCOUNT_LIMIT') setError('Account limit reached. Upgrade your plan to add more.');
        else if (/platform/i.test(msg)) setError('Invalid or unsupported platform selection.');
        else if (/inactive|subscription/i.test(msg)) setError('Your subscription is inactive. Reactivate to add accounts.');
        else if (/network|fetch/i.test(msg)) setError('Network issue while creating account. Retry.');
        else setError('Failed to create trading account. Please retry.');
        return;
      }
      await subscriptionContextRefresh();
      onSuccess?.();
      // reset form (keep platform selection for potential quick re-add)
      setFormData(f => ({ ...f, account_name: '', account_number: '', server: '', username: '', password: '' }));
    } catch {
      setError('Unexpected error creating account.');
    } finally { setLoading(false); }
  };

  const handleChange = (field: keyof TradingAccountFormType, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const inputClass = 'w-full rounded-md bg-neutral-800/60 border border-neutral-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50';
  const labelClass = 'text-xs font-medium uppercase tracking-wide text-neutral-400';

  const platformInvalid = !platformSelected && !platformsLoading;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {subscription && (
        <div className="text-xs rounded-md border border-neutral-700/60 bg-neutral-900/60 px-3 py-2 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-neutral-300">Plan:</span>
            <span className="text-neutral-400">{subscription.planName || 'Free'}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-400">Accounts Used: {subscription.accountsUsed}{typeof subscription.maxAccounts === 'number' ? ` / ${subscription.maxAccounts}` : ' / ∞'}</span>
            {typeof subscription.remainingAccounts === 'number' && subscription.remainingAccounts <= 1 && subscription.remainingAccounts >= 0 && (
              <span className="text-amber-400">{subscription.remainingAccounts === 0 ? 'No remaining slots' : 'Almost at limit'}</span>
            )}
          </div>
          {disabledReason && (
            <div className="text-red-400/80">
              {disabledReason} {subscription.remainingAccounts === 0 && <button type="button" onClick={() => (window.location.href = '/#pricing')} className="underline decoration-dotted ml-1">Upgrade</button>}
            </div>
          )}
        </div>
      )}
      {error && <div className="text-sm rounded-md border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 flex items-start gap-2"><AlertCircle size={14} className="mt-0.5" /> <span>{error}</span></div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="platform" className={labelClass}>Platform *</label>
          <div className="relative">
            <select
              id="platform"
              value={formData.platform_id}
              onChange={(e) => handleChange('platform_id', e.target.value)}
              required
              disabled={loading || limitReached || platformsLoading}
              className={cn(inputClass, platformInvalid && 'border-red-500 focus:border-red-500 focus:ring-red-500/30 pr-8', platformSelected && 'pr-8')}
            >
              <option value="">{platformsLoading ? 'Loading platforms…' : 'Select Platform'}</option>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!platformsLoading && platformSelected && (
              <CheckCircle2 size={16} className="text-emerald-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          {!platformsLoading && platformInvalid && <p className="text-xs text-red-400 pt-1">Select a platform to continue.</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="accountType" className={labelClass}>Account Type *</label>
          <select
            id="accountType"
            value={formData.account_type}
            onChange={(e) => handleChange('account_type', e.target.value as 'master' | 'slave')}
            required
            disabled={loading || limitReached}
            className={inputClass}
          >
            <option value="slave">Slave Account</option>
            <option value="master">Master Account</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="accountName" className={labelClass}>Account Name *</label>
          <input
            id="accountName"
            type="text"
            value={formData.account_name}
            onChange={(e) => handleChange('account_name', e.target.value)}
            required
            disabled={loading || limitReached}
            className={inputClass}
            placeholder="Primary Strategy"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="accountNumber" className={labelClass}>Account Number *</label>
            <input
              id="accountNumber"
              type="text"
              value={formData.account_number}
              onChange={(e) => handleChange('account_number', e.target.value)}
              required
              disabled={loading || limitReached}
              className={inputClass}
              placeholder="12345678"
            />
        </div>
        <div className="space-y-2">
          <label htmlFor="currency" className={labelClass}>Currency</label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            disabled={loading || limitReached}
            className={inputClass}
          >
            {['USD','EUR','GBP','JPY'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="server" className={labelClass}>Server</label>
          <input
            id="server"
            type="text"
            value={formData.server}
            onChange={(e) => handleChange('server', e.target.value)}
            disabled={loading || limitReached}
            className={inputClass}
            placeholder="demo.ctrader.com"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="username" className={labelClass}>Username / Login</label>
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            disabled={loading || limitReached}
            className={inputClass}
            placeholder="acct_login"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className={labelClass}>Password</label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            disabled={loading || limitReached}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-9 px-4 rounded-md border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-800/60 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || limitReached || platformsLoading || platformInvalid}
          className="h-9 px-5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {limitReached ? 'Limit Reached' : platformsLoading ? 'Loading…' : loading ? 'Creating…' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}