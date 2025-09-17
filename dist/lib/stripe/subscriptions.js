"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStatus = normalizeStatus;
exports.resolvePlan = resolvePlan;
exports.syncSubscription = syncSubscription;
exports.setFreePlan = setFreePlan;
exports.updateStatus = updateStatus;
exports.getUserIdFromCustomer = getUserIdFromCustomer;
const admin_1 = require("@/lib/supabase/admin");
const stripe_1 = require("@/types/stripe");
const server_1 = require("./server");
/** Map raw Stripe status to constrained app status */
function normalizeStatus(status) {
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
async function resolvePlan(subscription) {
    const price = subscription.items.data[0]?.price;
    if (!price)
        return undefined;
    const stripePriceId = price.id;
    // Try database plans first
    const { data: dbPlan } = await admin_1.supabaseAdmin.from('plans').select('*').eq('stripe_price_id', stripePriceId).maybeSingle();
    if (dbPlan) {
        return {
            id: dbPlan.id,
            name: dbPlan.name,
            price: Number(dbPlan.price),
            interval: dbPlan.interval,
            maxAccounts: dbPlan.max_accounts,
            maxCopyMappings: dbPlan.max_copy_mappings,
            priceId: stripePriceId,
        };
    }
    // Fallback to static list
    return stripe_1.SUBSCRIPTION_PLANS.find(p => p.priceId === stripePriceId);
}
const safeUnixMs = (v) => (typeof v === 'number' && !isNaN(v) ? v * 1000 : Date.now());
/** Upsert a subscription row based on a Stripe subscription object */
async function syncSubscription(stripeSub, userId) {
    const plan = await resolvePlan(stripeSub);
    if (!plan)
        throw new Error('Plan not found for subscription price');
    const { error } = await admin_1.supabaseAdmin.from('subscriptions').upsert({
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
        current_period_start: new Date(safeUnixMs(stripeSub.current_period_start)).toISOString(),
        current_period_end: new Date(safeUnixMs(stripeSub.current_period_end)).toISOString(),
        cancel_at_period_end: stripeSub.cancel_at_period_end,
    }, { onConflict: 'user_id' });
    if (error)
        throw error;
}
/** Downgrade a user to free plan (keeps single row). */
async function setFreePlan(userId) {
    const free = stripe_1.SUBSCRIPTION_PLANS[0];
    const { error } = await admin_1.supabaseAdmin.from('subscriptions').update({
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
    if (error)
        throw error;
}
/** Update only status for a subscription by stripe_subscription_id */
async function updateStatus(stripeSubscriptionId, status) {
    const { error } = await admin_1.supabaseAdmin.from('subscriptions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeSubscriptionId);
    if (error)
        throw error;
}
/** Fetch stripe customer and derive userId */
async function getUserIdFromCustomer(customerId) {
    const customer = await server_1.stripe.customers.retrieve(customerId);
    if (customer.deleted)
        throw new Error('Customer deleted');
    const userId = customer.metadata.userId;
    if (!userId)
        throw new Error('Missing userId in customer metadata');
    return userId;
}
