import { supabaseAdmin } from '@/lib/supabase/admin';

export interface SubscriptionFeatures {
  planName: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  maxAccounts: number; // -1 = unlimited
  maxCopyMappings: number; // -1 = unlimited
  remainingAccounts: number | null; // null if unlimited
  remainingCopyMappings: number | null; // null if unlimited
  cancelAtPeriodEnd: boolean;
  periodEnd: string;
  isActive: boolean;
  isPastDue: boolean;
  isFree: boolean;
}

export async function getCurrentSubscription(userId: string): Promise<SubscriptionFeatures | null> {
  const { data: sub, error } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).single();
  if (error || !sub) return null;

  // Count current usage
  const [{ count: accountCount }, { count: mappingCount }] = await Promise.all([
    supabaseAdmin.from('trading_accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('copy_mappings').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  ]);

  const unlimitedAccounts = sub.max_accounts < 0;
  const unlimitedMappings = sub.max_copy_mappings < 0;
  return {
    planName: sub.plan_name,
    status: sub.status,
    maxAccounts: sub.max_accounts,
    maxCopyMappings: sub.max_copy_mappings,
    remainingAccounts: unlimitedAccounts ? null : Math.max(sub.max_accounts - (accountCount ?? 0), 0),
    remainingCopyMappings: unlimitedMappings ? null : Math.max(sub.max_copy_mappings - (mappingCount ?? 0), 0),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    periodEnd: sub.current_period_end,
    isActive: sub.status === 'active',
    isPastDue: sub.status === 'past_due',
    isFree: sub.plan_name.toLowerCase() === 'free'
  };
}