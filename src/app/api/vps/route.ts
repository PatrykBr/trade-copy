import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vpsConnectionManager } from '@/lib/vps/connection-manager';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const accountId = searchParams.get('accountId');

    switch (action) {
      case 'status':
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }
        
        const status = await vpsConnectionManager.getConnectionStatus(accountId);
        return NextResponse.json({ status });

      case 'health':
        // Get VPS health overview
        const { data: vpsInstances, error } = await supabase
          .from('vps_instances')
          .select(`
            *,
            connection_health_logs (
              status,
              checked_at,
              response_time_ms
            )
          `)
          .order('created_at', { ascending: true });

        if (error) {
          return NextResponse.json({ error: 'Failed to fetch VPS health' }, { status: 500 });
        }

        return NextResponse.json({ vpsInstances });

      default:
        // List all VPS instances
        const { data: allVPS, error: vpsError } = await supabase
          .from('vps_instances')
          .select('*')
          .order('name');

        if (vpsError) {
          return NextResponse.json({ error: 'Failed to fetch VPS instances' }, { status: 500 });
        }

        return NextResponse.json({ vpsInstances: allVPS });
    }
  } catch (error) {
    console.error('VPS API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, accountId } = body;

    switch (action) {
      case 'assign':
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Verify user owns the account
        const { data: account, error: accountError } = await supabase
          .from('trading_accounts')
          .select('id, user_id')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single();

        if (accountError || !account) {
          return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
        }

        const vps = await vpsConnectionManager.assignAccountToVPS(accountId);
        
        if (vps) {
          return NextResponse.json({ 
            message: 'Account assigned to VPS successfully',
            vps: vps 
          });
        } else {
          return NextResponse.json({ 
            error: 'No available VPS for assignment' 
          }, { status: 503 });
        }

      case 'connect':
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Verify user owns the account
        const { data: userAccount, error: userAccountError } = await supabase
          .from('trading_accounts')
          .select('id, user_id')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single();

        if (userAccountError || !userAccount) {
          return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
        }

        const connected = await vpsConnectionManager.connectAccount(accountId);
        
        if (connected) {
          return NextResponse.json({ 
            message: 'Account connected to VPS successfully' 
          });
        } else {
          return NextResponse.json({ 
            error: 'Failed to connect account to VPS' 
          }, { status: 500 });
        }

      case 'disconnect':
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Verify user owns the account
        const { data: disconnectAccount, error: disconnectError } = await supabase
          .from('trading_accounts')
          .select('id, user_id')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single();

        if (disconnectError || !disconnectAccount) {
          return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
        }

        const disconnected = await vpsConnectionManager.disconnectAccount(accountId);
        
        if (disconnected) {
          return NextResponse.json({ 
            message: 'Account disconnected from VPS successfully' 
          });
        } else {
          return NextResponse.json({ 
            error: 'Failed to disconnect account from VPS' 
          }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('VPS API POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}