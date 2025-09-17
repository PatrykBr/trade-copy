import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSubscription } from '@/lib/stripe/current-subscription';
// Lightweight UUID v4 format validation (avoids extra dependency)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validateUuid = (value: string) => UUID_REGEX.test(value);

// List accounts for authenticated user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('trading_accounts')
    .select('*, platform:trading_platforms(id,name,code,supports_copy_trading,is_active,created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// Expected payload { platform_id? | platform_code?, account_name, account_number, account_type, currency?, server? }
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  
  const { account_name, account_number, account_type, currency = 'USD', server } = body;
  let { platform_id } = body;
  const { platform_code } = body;
  if ((!platform_id && !platform_code) || !account_name || !account_number || !account_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['master','slave'].includes(account_type)) {
    return NextResponse.json({ error: 'Invalid account_type' }, { status: 400 });
  }

  // Subscription enforcement
  const sub = await getCurrentSubscription(user.id);
  if (!sub || !sub.isActive) {
    return NextResponse.json({ error: 'Subscription inactive or missing' }, { status: 403 });
  }
  if (sub.remainingAccounts !== null && sub.remainingAccounts <= 0) {
    return NextResponse.json({ error: 'Account limit reached', code: 'ACCOUNT_LIMIT' }, { status: 403 });
  }

  // Resolve platform id if a code was provided instead of a UUID
  if (platform_code && !platform_id) {
    const { data: platformRow, error: platformErr } = await supabase.from('trading_platforms').select('id').eq('code', platform_code).single();
    if (platformErr || !platformRow) {
      return NextResponse.json({ error: 'Invalid platform code' }, { status: 400 });
    }
    platform_id = platformRow.id;
  }

  if (!validateUuid(platform_id)) {
    return NextResponse.json({ error: 'Invalid platform_id format' }, { status: 400 });
  }

  const { data, error } = await supabase.from('trading_accounts').insert({
      user_id: user.id,
      platform_id,
      account_name,
      account_number,
      account_type,
      currency,
      server
    }).select('*').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}