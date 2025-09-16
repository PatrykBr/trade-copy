import { NextRequest } from 'next/server';
import { createTradeClient } from '@/lib/supabase/trade-client';

// Vercel Edge Function for Trade Bridge WebSocket alternative
// This provides HTTP endpoints instead of WebSocket for MT4/MT5 EAs

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  switch (endpoint) {
    case 'health':
      return new Response('OK', { status: 200 });
      
    case 'status':
      return Response.json({ 
        status: 'active', 
        timestamp: new Date().toISOString(),
        service: 'trade-bridge-http'
      });
      
    default:
      return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const body = await request.json();

    const supabase = createTradeClient();

    switch (endpoint) {
      case 'trade-signal':
        return await handleTradeSignal(supabase, body);
        
      case 'heartbeat':
        return await handleHeartbeat(supabase, body);
        
      case 'get-instructions':
        return await getInstructions(supabase, body);
        
      default:
        return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
    }
  } catch (error) {
    console.error('Trade Bridge Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleTradeSignal(supabase: any, body: any) {
  const { accountNumber, trade, platform } = body;
  
  try {
    // Store trade in database
    const { data: account } = await supabase
      .from('trading_accounts')
      .select('id, user_id, account_type')
      .eq('account_number', accountNumber)
      .single();

    if (!account) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    // Insert trade record
    const { data: tradeRecord, error: tradeError } = await supabase
      .from('trades')
      .insert({
        account_id: account.id,
        platform_trade_id: trade.ticket || trade.id,
        symbol: trade.symbol,
        trade_type: trade.type === 0 ? 'buy' : 'sell',
        lot_size: trade.lots || trade.volume,
        open_price: trade.openPrice || trade.price,
        stop_loss: trade.stopLoss,
        take_profit: trade.takeProfit,
        status: trade.status || 'open',
        opened_at: new Date(trade.openTime || Date.now())
      })
      .select()
      .single();

    if (tradeError) {
      return Response.json({ error: 'Failed to store trade' }, { status: 500 });
    }

    // If this is a master account, create copy instructions
    if (account.account_type === 'master') {
      await createCopyInstructions(supabase, account.id, tradeRecord.id);
    }

    return Response.json({ 
      success: true, 
      tradeId: tradeRecord.id,
      message: 'Trade signal processed'
    });

  } catch (error) {
    console.error('Trade signal error:', error);
    return Response.json({ error: 'Failed to process trade signal' }, { status: 500 });
  }
}

async function handleHeartbeat(supabase: any, body: any) {
  const { accountNumber, platform, version } = body;
  
  try {
    // Update connection status
    await supabase
      .from('ea_connections')
      .upsert({
        account_id: body.accountId,
        connection_type: 'http',
        platform: platform,
        ea_version: version,
        last_heartbeat: new Date().toISOString(),
        is_active: true
      });

    return Response.json({ success: true, message: 'Heartbeat received' });
  } catch (error) {
    return Response.json({ error: 'Heartbeat failed' }, { status: 500 });
  }
}

async function getInstructions(supabase: any, body: any) {
  const { accountNumber } = body;
  
  try {
    // Get pending copy instructions for this account
    const { data: account } = await supabase
      .from('trading_accounts')
      .select('id')
      .eq('account_number', accountNumber)
      .single();

    if (!account) {
      return Response.json({ instructions: [] });
    }

    const { data: instructions } = await supabase
      .from('copy_instructions')
      .select(`
        id,
        instruction_data,
        copy_mappings!inner(slave_account_id)
      `)
      .eq('copy_mappings.slave_account_id', account.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    // Mark instructions as fetched
    if (instructions && instructions.length > 0) {
      await supabase
        .from('copy_instructions')
        .update({ 
          status: 'fetched', 
          fetched_at: new Date().toISOString() 
        })
        .in('id', instructions.map((i: any) => i.id));
    }

    return Response.json({ 
      instructions: instructions || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get instructions error:', error);
    return Response.json({ instructions: [] });
  }
}

async function createCopyInstructions(supabase: any, masterAccountId: string, tradeId: string) {
  try {
    // Get all copy mappings for this master account
    const { data: mappings } = await supabase
      .from('copy_mappings')
      .select(`
        id,
        slave_account_id,
        lot_scaling_type,
        lot_scaling_value,
        copy_symbols,
        ignore_symbols,
        max_lot_size,
        min_lot_size,
        is_active
      `)
      .eq('master_account_id', masterAccountId)
      .eq('is_active', true);

    if (!mappings || mappings.length === 0) return;

    // Get the master trade details
    const { data: trade } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (!trade) return;

    // Create copy instructions for each mapping
    for (const mapping of mappings) {
      // Check symbol filters
      if (mapping.copy_symbols && !mapping.copy_symbols.includes(trade.symbol)) continue;
      if (mapping.ignore_symbols && mapping.ignore_symbols.includes(trade.symbol)) continue;

      // Calculate lot size based on scaling
      let scaledLotSize = trade.lot_size;
      if (mapping.lot_scaling_type === 'percentage') {
        scaledLotSize = trade.lot_size * (mapping.lot_scaling_value / 100);
      } else if (mapping.lot_scaling_type === 'fixed') {
        scaledLotSize = mapping.lot_scaling_value;
      }

      // Apply lot size limits
      if (mapping.max_lot_size && scaledLotSize > mapping.max_lot_size) {
        scaledLotSize = mapping.max_lot_size;
      }
      if (mapping.min_lot_size && scaledLotSize < mapping.min_lot_size) {
        scaledLotSize = mapping.min_lot_size;
      }

      // Create instruction data
      const instructionData = {
        action: 'open_trade',
        symbol: trade.symbol,
        trade_type: trade.trade_type,
        lot_size: scaledLotSize,
        price: trade.open_price,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        comment: `Copy:${trade.platform_trade_id}`
      };

      // Insert copy instruction
      await supabase
        .from('copy_instructions')
        .insert({
          mapping_id: mapping.id,
          master_trade_id: tradeId,
          instruction_data: instructionData,
          status: 'pending',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        });
    }

  } catch (error) {
    console.error('Create copy instructions error:', error);
  }
}