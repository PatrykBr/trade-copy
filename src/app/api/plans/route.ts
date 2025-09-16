import { NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '@/types/stripe';

// Serves plan metadata (excluding secrets) with resolved priceIds so client can refresh if env changes.
export async function GET() {
  const plans = SUBSCRIPTION_PLANS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    priceId: p.priceId,
    interval: p.interval,
    maxAccounts: p.maxAccounts,
    maxCopyMappings: p.maxCopyMappings,
    isPopular: p.isPopular || false,
    features: p.features,
  }));
  return NextResponse.json({ plans });
}