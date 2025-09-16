"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SUBSCRIPTION_PLANS } from '@/types/stripe';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isClient, setIsClient] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState(SUBSCRIPTION_PLANS);
  const [refreshing, setRefreshing] = useState(false);
  
  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    const saved = window.localStorage.getItem('billing_interval');
    if (saved === 'monthly' || saved === 'yearly') {
      setBillingInterval(saved);
    }
  }, []);
  
  // Refresh plans to ensure priceIds are populated (especially in browser env where build-time env may differ).
  useEffect(() => {
    const load = async () => {
      try {
        setRefreshing(true);
        const res = await fetch('/api/plans');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.plans) setPlans(data.plans);
      } finally {
        setRefreshing(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isClient) {
      window.localStorage.setItem('billing_interval', billingInterval);
    }
  }, [billingInterval, isClient]);

  // 20% discount for yearly billing. We still show monthly (discounted) prominently and total yearly in a caption.
  const discountRate = 0.2;

  const { user } = useAuth();

  const handleCheckout = useCallback(async (planId: string, priceId: string | undefined) => {
    if (planId === 'free') {
      window.location.href = user ? '/dashboard' : '/signup';
      return;
    }
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!priceId) {
      alert('Pricing configuration is being updated. Please try again in a moment.');
      return;
    }
    try {
      setLoadingPlan(planId);
      const userId = user?.id;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
      alert('Unable to start checkout. Please try again shortly.');
    } finally {
      setLoadingPlan(null);
    }
  }, [user]);

  return (
    <section id="pricing" className="relative py-28 border-t border-neutral-800/60">
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_center,white,transparent_75%)] bg-[linear-gradient(120deg,rgba(56,189,248,0.08),transparent),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.08),transparent_60%)]" />
      <div className="container-page">
        <div className="max-w-2xl mb-14 mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Simple, scalable <span className="copy-accent">pricing</span></h2>
          <p className="text-neutral-300 text-lg">Start free. Upgrade only when you need more accounts, mappings or advanced tooling.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-800/70 bg-neutral-900/70 backdrop-blur px-1 text-xs text-neutral-300" role="group" aria-label="Billing interval toggle">
            <button
              onClick={() => setBillingInterval('monthly')}
              aria-pressed={billingInterval==='monthly'}
              className={"px-3 py-1 rounded-full transition text-xs font-medium " + (billingInterval==='monthly' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 shadow-inner shadow-cyan-500/20' : 'hover:text-neutral-100')}
            >Monthly</button>
            <button
              onClick={() => setBillingInterval('yearly')}
              aria-pressed={billingInterval==='yearly'}
              className={"px-3 py-1 rounded-full transition text-xs font-medium flex items-center gap-1 " + (billingInterval==='yearly' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 shadow-inner shadow-cyan-500/20' : 'hover:text-neutral-100')}
            >Yearly <span className="hidden sm:inline text-[10px] text-cyan-400/80 font-normal">20% off</span></button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {plans.map(plan => {
            const isFree = plan.price === 0;
            // Base monthly price from plan.price. Yearly uses discounted monthly (20% off), yearly total displayed separately.
            const discountedMonthly = !isFree ? Math.round(plan.price * (1 - discountRate)) : 0;
            const yearlyTotal = !isFree ? discountedMonthly * 12 : 0;
            const showMonthly = billingInterval === 'monthly' ? plan.price : discountedMonthly;
            const noteYearly = billingInterval === 'yearly' && !isFree;
            const filteredFeatures = plan.features.filter(f => !/trading accounts|copy mapping/i.test(f));
            return (
              <Card key={plan.id} variant={plan.isPopular ? 'glow' : 'outline'} className={(plan.isPopular ? 'relative overflow-visible ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-500/10 ' : 'relative ') + 'flex flex-col'}>
                {plan.isPopular && (
                  <div className="absolute -top-3 right-4 px-2 py-1 rounded-md text-[10px] tracking-wide font-semibold bg-neutral-900 border border-cyan-500/60 text-cyan-300 flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/60"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                    </span>
                    POPULAR
                  </div>
                )}
                <CardHeader className="pb-4 pt-5">
                  <CardTitle className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-neutral-400">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-0 pb-6 flex flex-col flex-1">
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-neutral-100">{isFree ? '$0' : `$${showMonthly}`}</span>
                    <span className="text-neutral-500 text-xs mb-1">/mo</span>
                    {billingInterval === 'yearly' && !isFree && (
                      <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">20% OFF</span>
                    )}
                  </div>
                  {noteYearly && (
                    <div className="text-[11px] -mt-3 text-neutral-500">Billed annually at <span className="text-neutral-300 font-medium">${yearlyTotal}</span></div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-[11px] text-neutral-400">
                    <div className="rounded-md border border-neutral-800/60 bg-neutral-900/40 p-2">
                      <div className="text-neutral-300 font-medium text-xs mb-0.5">Accounts</div>
                      <div className="text-neutral-100 text-sm">{plan.maxAccounts < 0 ? 'Unlimited' : plan.maxAccounts}</div>
                    </div>
                    <div className="rounded-md border border-neutral-800/60 bg-neutral-900/40 p-2">
                      <div className="text-neutral-300 font-medium text-xs mb-0.5">Copy Mappings</div>
                      <div className="text-neutral-100 text-sm">{plan.maxCopyMappings < 0 ? 'Unlimited' : plan.maxCopyMappings}</div>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-300 flex-1">
                    {filteredFeatures.map(f => (
                      <li key={f} className="flex gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1" /> {f}</li>
                    ))}
                  </ul>
                  <div className="mt-2">
                    {isFree ? (
                      <Button asChild variant={plan.isPopular ? 'gradient' : 'outline'} className="w-full h-10 text-sm font-medium group relative overflow-hidden">
                        <Link href={'/signup'}>
                          <span className="relative z-10">Get Started</span>
                          {plan.isPopular && <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-transparent" />}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        disabled={loadingPlan === plan.id}
                        onClick={() => handleCheckout(plan.id, plan.priceId)}
                        variant={plan.isPopular ? 'gradient' : 'outline'}
                        className="w-full h-10 text-sm font-medium group relative overflow-hidden"
                        aria-live="polite"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {loadingPlan === plan.id && (
                            <span className="h-3 w-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                          )}
                          {loadingPlan === plan.id ? 'Redirecting…' : refreshing && !plan.priceId ? 'Loading…' : 'Choose Plan'}
                        </span>
                        {plan.isPopular && <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-transparent" />}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="mt-10 text-center text-xs text-neutral-500">Need higher throughput or custom integration? <Link href="#" className="underline hover:text-neutral-300">Contact us</Link>.</p>
      </div>
    </section>
  );
}
