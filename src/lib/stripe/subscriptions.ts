import { supabaseAdmin } from '@/lib/supabase/admin';
import { SUBSCRIPTION_PLANS } from '@/types/stripe';
import { stripe } from './server';
import Stripe from 'stripe';

/** Map raw Stripe status to constrained app status */
export function normalizeStatus(status: string): 'active' | 'canceled' | 'past_due' | 'incomplete' {
  switch (status) {
    case 'trialing':
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    case 'incomplete':
      return 'incomplete';
    case 'incomplete_expired':
      return 'canceled';
    case 'unpaid':
    case 'paused':
      return 'past_due';
    default:
      return 'active';
  }
}

/** Resolve internal plan definition from a Stripe Subscription */
export async function resolvePlan(subscription: Stripe.Subscription) {
  const price = subscription.items.data[0]?.price;
  if (!price) return undefined;
  const stripePriceId = price.id;
  // Try database plans first
  const { data: dbPlan } = await supabaseAdmin.from('plans').select('*').eq('stripe_price_id', stripePriceId).maybeSingle();
  if (dbPlan) {
    return {
      id: dbPlan.id,
      name: dbPlan.name,
      price: Number(dbPlan.price),
      interval: dbPlan.interval as 'monthly' | 'yearly',
      maxAccounts: dbPlan.max_accounts,
      maxCopyMappings: dbPlan.max_copy_mappings,
      priceId: stripePriceId,
    };
  }
  // Fallback to static list
  return SUBSCRIPTION_PLANS.find(p => p.priceId === stripePriceId);
}

const safeUnixMs = (v: unknown) => (typeof v === 'number' && !isNaN(v) ? v * 1000 : Date.now());

/** Upsert a subscription row based on a Stripe subscription object */
export async function syncSubscription(stripeSub: Stripe.Subscription, userId: string) {
  const plan = await resolvePlan(stripeSub);
  if (!plan) throw new Error('Plan not found for subscription price');

  const { error } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: stripeSub.id,
    stripe_customer_id: String(stripeSub.customer),
    plan_name: plan.name,
    plan_price: plan.price,
    billing_cycle: plan.interval,
    max_accounts: plan.maxAccounts,
    max_copy_mappings: plan.maxCopyMappings,
    stripe_price_id: plan.priceId,
    status: normalizeStatus(stripeSub.status),
    current_period_start: new Date(safeUnixMs((stripeSub as Stripe.Subscription & { current_period_start?: number }).current_period_start)).toISOString(),
    current_period_end: new Date(safeUnixMs((stripeSub as Stripe.Subscription & { current_period_end?: number }).current_period_end)).toISOString(),
    cancel_at_period_end: stripeSub.cancel_at_period_end,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

/** Downgrade a user to free plan (keeps single row). */
export async function setFreePlan(userId: string) {
  const free = SUBSCRIPTION_PLANS[0];
  const { error } = await supabaseAdmin.from('subscriptions').update({
    plan_name: free.name,
    plan_price: free.price,
    billing_cycle: free.interval,
    max_accounts: free.maxAccounts,
    max_copy_mappings: free.maxCopyMappings,
    status: 'active',
    stripe_subscription_id: null,
    cancel_at_period_end: false,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
  if (error) throw error;
}

/** Update only status for a subscription by stripe_subscription_id */
export async function updateStatus(stripeSubscriptionId: string, status: 'active' | 'past_due') {
  const { error } = await supabaseAdmin.from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', stripeSubscriptionId);
  if (error) throw error;
}

/** Fetch stripe customer and derive userId */
export async function getUserIdFromCustomer(customerId: string): Promise<string> {
  const customer = await stripe().customers.retrieve(customerId);
  if (customer.deleted) throw new Error('Customer deleted');
  const userId = customer.metadata.userId;
  if (!userId) throw new Error('Missing userId in customer metadata');
  return userId;
}
