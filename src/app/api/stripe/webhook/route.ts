import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncSubscription, setFreePlan, updateStatus, getUserIdFromCustomer } from '@/lib/stripe/subscriptions';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Use service role for writing irrespective of user session (webhooks are server-to-server).
  const supabase = supabaseAdmin;

  // (period handling handled inside helper now)

  try {
    // Idempotency: check if event already processed
  const { data: existingEvent } = await supabase.from('stripe_events').select('id,status').eq('id', event.id).maybeSingle() as { data: { id: string; status: string } | null };
    if (existingEvent && existingEvent.status === 'processed') {
      return NextResponse.json({ received: true, idempotent: true });
    }
    if (!existingEvent) {
      await supabase.from('stripe_events').insert({ id: event.id, type: event.type });
    }

    // Set current event id as a local parameter for triggers (best-effort)
    try {
      await supabase.rpc('pg_catalog.set_config', { parameter: 'app.current_stripe_event_id', value: event.id, is_local: true });
    } catch { /* non-critical */ }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Expand subscription to ensure we have latest
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          try {
            const userId = await getUserIdFromCustomer(subscription.customer as string);
            await syncSubscription(subscription, userId);
          } catch (e) {
            console.error('[webhook][checkout.session.completed] sync error', e);
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        try {
          const userId = await getUserIdFromCustomer(subscription.customer as string);
          await syncSubscription(subscription, userId);
        } catch (e) {
          console.error('[webhook][subscription.created|updated] sync error', e);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        try {
          const userId = await getUserIdFromCustomer(subscription.customer as string);
          await setFreePlan(userId);
        } catch (e) {
          console.error('[webhook][subscription.deleted] free downgrade error', e);
        }

        break;
      }

      case 'invoice.payment_succeeded': {
  const invoice = event.data.object as Stripe.Invoice;
  const invMaybe = invoice as unknown as { subscription?: unknown };
  const subId = typeof invMaybe.subscription === 'string' ? invMaybe.subscription : undefined;
        if (subId) {
          try { await updateStatus(subId, 'active'); } catch (e) { console.error('[webhook][invoice.payment_succeeded] status error', e); }
        }
        break;
      }

      case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice;
  const invMaybe = invoice as unknown as { subscription?: unknown };
  const subId = typeof invMaybe.subscription === 'string' ? invMaybe.subscription : undefined;
        if (subId) {
          try { await updateStatus(subId, 'past_due'); } catch (e) { console.error('[webhook][invoice.payment_failed] status error', e); }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark processed
    await supabase.from('stripe_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    try {
      const message = error instanceof Error ? error.message : 'unknown_error';
      await supabase.from('stripe_events').update({ status: 'error', error_message: message }).eq('id', (event as Stripe.Event | undefined)?.id || '');
    } catch {}
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}