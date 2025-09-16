import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get copy instructions for a specific account
export async function GET(
  request: Request,
  { params }: { params: { accountNumber: string } }
) {
  try {
    const supabase = await createClient();
    const { accountNumber } = params;
    
    // Get URL parameters
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('apiKey');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' }, 
        { status: 401 }
      );
    }

    // Authenticate account
    const { data: account, error: authError } = await supabase
      .from('trading_accounts')
      .select('id, user_id, account_type')
      .eq('account_number', accountNumber)
      .eq('account_type', 'slave') // Only slave accounts get copy instructions
      .single();

    if (authError || !account) {
      return NextResponse.json(
        { error: 'Slave account not found' }, 
        { status: 401 }
      );
    }

    // Get pending copy instructions for this account
    const { data: instructions, error } = await supabase
      .from('copy_instructions')
      .select(`
        id, instruction_data, created_at,
        mapping:copy_mappings!mapping_id(id, slave_account_id),
        master_trade:trades!master_trade_id(id, symbol, trade_type, lot_size)
      `)
      .eq('copy_mappings.slave_account_id', account.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Limit to 10 instructions per request

    if (error) {
      console.error('Error fetching instructions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch instructions' }, 
        { status: 500 }
      );
    }

    // Mark instructions as fetched
    if (instructions && instructions.length > 0) {
      const instructionIds = instructions.map(inst => inst.id);
      await supabase
        .from('copy_instructions')
        .update({ status: 'fetched', fetched_at: new Date().toISOString() })
        .in('id', instructionIds);
    }

    return NextResponse.json({
      success: true,
      instructions: instructions || [],
      count: instructions?.length || 0
    });

  } catch (error) {
    console.error('Error getting copy instructions:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Report execution result from slave account
export async function POST(
  request: Request,
  { params }: { params: { accountNumber: string } }
) {
  try {
    const supabase = await createClient();
    const { accountNumber } = params;
    const body = await request.json();
    
    const { 
      instructionId,
      masterTradeId, 
      mappingId, 
      slaveTicket, 
      status, 
      error: executionError,
      apiKey
    } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' }, 
        { status: 401 }
      );
    }

    // Authenticate account
    const { data: account, error: authError } = await supabase
      .from('trading_accounts')
      .select('id, user_id, account_type')
      .eq('account_number', accountNumber)
      .eq('account_type', 'slave')
      .single();

    if (authError || !account) {
      return NextResponse.json(
        { error: 'Slave account not found' }, 
        { status: 401 }
      );
    }

    // Update copy instruction status
    if (instructionId) {
      await supabase
        .from('copy_instructions')
        .update({ 
          status: status === 'success' ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          error_message: executionError || null
        })
        .eq('id', instructionId);
    }

    // Update copied_trades record
    if (masterTradeId && mappingId) {
      const updateData: any = {
        copy_status: status,
        copied_at: new Date().toISOString()
      };

      if (status === 'success' && slaveTicket) {
        // Create the slave trade record
        const { data: masterTrade } = await supabase
          .from('trades')
          .select('symbol, trade_type, lot_size, open_price, stop_loss, take_profit')
          .eq('id', masterTradeId)
          .single();

        if (masterTrade) {
          const { data: slaveTrade } = await supabase
            .from('trades')
            .insert({
              account_id: account.id,
              platform_trade_id: slaveTicket.toString(),
              symbol: masterTrade.symbol,
              trade_type: masterTrade.trade_type,
              lot_size: masterTrade.lot_size,
              open_price: masterTrade.open_price,
              stop_loss: masterTrade.stop_loss,
              take_profit: masterTrade.take_profit,
              status: 'open',
              opened_at: new Date().toISOString()
            })
            .select()
            .single();

          if (slaveTrade) {
            updateData.slave_trade_id = slaveTrade.id;
          }
        }
      } else if (status === 'failed') {
        updateData.error_message = executionError;
      }

      await supabase
        .from('copied_trades')
        .update(updateData)
        .eq('master_trade_id', masterTradeId)
        .eq('mapping_id', mappingId);
    }

    return NextResponse.json({
      success: true,
      message: 'Execution result recorded'
    });

  } catch (error) {
    console.error('Error recording execution result:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}