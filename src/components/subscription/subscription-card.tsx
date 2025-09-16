"use client";
import { useState } from 'react';
import { useSubscription } from '@/contexts/subscription-context';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/types/stripe';

export function SubscriptionCard() {
  const { subscription, loading, refresh } = useSubscription();
  const [cancelling, setCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    // API wrapper could be adapted to context style; leaving as placeholder
    setCancelling(true);
    try {
      // This assumes API uses stripe subscription id indirectly via server lookup
      const response = await fetch('/api/stripe/cancel', { method: 'POST' });
      if (!response.ok) throw new Error('Cancel failed');
      await refresh();
      alert('Subscription will be cancelled at period end.');
    } catch (e) {
      console.error(e);
      alert('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/#pricing';
  };

  const statusText = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) return 'Cancelling';
    return status;
  };

  const getCurrentPlan = (): SubscriptionPlan | null => {
    const planName = subscription?.planName;
    if (!planName) return SUBSCRIPTION_PLANS[0];
    return (
      SUBSCRIPTION_PLANS.find(p => p.name.toLowerCase() === planName.toLowerCase()) || SUBSCRIPTION_PLANS[0]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) return <div className="text-xs text-neutral-500">Loading subscription…</div>;

  const currentPlan = getCurrentPlan();
  const isFreePlan = !subscription || subscription.planName === 'Free';

  return (
    <div>
      <h3 className="font-semibold mb-2">Current Plan</h3>
      <div className="text-sm mb-1">Name: {currentPlan?.name || 'Free'} {subscription && `(${statusText(subscription.status || 'active', subscription.cancelAtPeriodEnd)})`}</div>
      <div className="text-sm mb-1">Price: ${subscription?.planPrice || 0}{subscription && subscription.planPrice && subscription.planPrice > 0 && ` / ${subscription.billingCycle}`}</div>
      <div className="text-xs text-neutral-400 mb-3">{currentPlan?.description || 'Perfect for trying out our platform'}</div>
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div className="p-2 rounded-md bg-neutral-800/60 border border-neutral-700">
          <div className="text-neutral-500">Accounts</div>
          <div className="font-medium text-neutral-200">{subscription?.accountsUsed ?? 0}{typeof subscription?.maxAccounts === 'number' ? ` / ${subscription.maxAccounts}` : ' / ∞'}</div>
        </div>
        <div className="p-2 rounded-md bg-neutral-800/60 border border-neutral-700">
          <div className="text-neutral-500">Copy Mappings</div>
            <div className="font-medium text-neutral-200">{subscription?.mappingsUsed ?? 0}{typeof subscription?.maxCopyMappings === 'number' ? ` / ${subscription.maxCopyMappings}` : ' / ∞'}</div>
        </div>
      </div>
      {subscription?.currentPeriodEnd && subscription.planPrice && subscription.planPrice > 0 && (
        <div className="text-[11px] text-neutral-500 mb-2">Next billing: {formatDate(subscription.currentPeriodEnd)}{subscription.cancelAtPeriodEnd && ' (will cancel)'}
        </div>
      )}
      <div>
        {isFreePlan ? (
          <button onClick={handleUpgrade}>Upgrade Plan</button>
        ) : (
          <>
            <button onClick={handleUpgrade}>Change Plan</button>
            {!subscription?.cancelAtPeriodEnd && (
              <button onClick={handleCancelSubscription} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Cancel Plan'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}