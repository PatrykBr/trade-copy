import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const accountId = searchParams.get('account_id');

  try {
    // Get user's trading accounts
    const { data: accounts } = await supabase
      .from('trading_accounts')
      .select('id')
      .eq('user_id', user.id);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const accountIds = accounts.map(acc => acc.id);
    let query = supabase
      .from('trades')
      .select(`
        *,
        account:trading_accounts!inner(
          account_name,
          platform:trading_platforms(name)
        )
      `)
      .in('account_id', accountIds)
      .order('opened_at', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}