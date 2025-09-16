import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handle trade signals from Expert Advisors
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { 
      accountNumber, 
      apiKey, 
      type, 
      trade, 
      timestamp 
    } = body;

    // Validate required fields
    if (!accountNumber || !apiKey || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Authenticate account
    const { data: account, error: authError } = await supabase
      .from('trading_accounts')
      .select('id, user_id, account_type, encrypted_credentials')
      .eq('account_number', accountNumber)
      .single();

    if (authError || !account) {
      return NextResponse.json(
        { error: 'Account not found' }, 
        { status: 401 }
      );
    }

    // Verify API key (simplified - in production, decrypt and compare)
    // const isValidKey = await verifyApiKey(account.encrypted_credentials, apiKey);
    // if (!isValidKey) {
    //   return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    // }

    // Process different signal types
    switch (type) {
      case 'trade_opened':
        return await handleTradeOpened(supabase, account, trade);
      
      case 'trade_closed':
        return await handleTradeClosed(supabase, account, trade);
      
      case 'trade_modified':
        return await handleTradeModified(supabase, account, trade);
      
      case 'heartbeat':
        return await handleHeartbeat(supabase, account);
      
      default:
        return NextResponse.json(
          { error: 'Unknown signal type' }, 
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Trade signal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

async function handleTradeOpened(tradeData: unknown, account: unknown, supabase: unknown) {
  try {
    // Insert trade into database
    const { data: newTrade, error } = await supabase
      .from('trades')
      .insert({
        account_id: account.id,
        platform_trade_id: trade.platformTradeId,
        symbol: trade.symbol,
        trade_type: trade.tradeType,
        lot_size: trade.lotSize,
        open_price: trade.openPrice,
        stop_loss: trade.stopLoss,
        take_profit: trade.takeProfit,
        status: 'open',
        opened_at: trade.openTime || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting trade:', error);
      return NextResponse.json(
        { error: 'Failed to record trade' }, 
        { status: 500 }
      );
    }

    // If this is a master account, trigger copy operations
    if (account.account_type === 'master') {
      await processCopyMappings(supabase, newTrade);
    }

    return NextResponse.json({
      success: true,
      tradeId: newTrade.id,
      message: 'Trade recorded successfully'
    });

  } catch (error) {
    console.error('Error handling trade opened:', error);
    return NextResponse.json(
      { error: 'Failed to process trade signal' }, 
      { status: 500 }
    );
  }
}

async function handleTradeClosed(tradeData: unknown, account: unknown, supabase: unknown) {
  try {
    // Update trade in database
    const { data: updatedTrade, error } = await supabase
      .from('trades')
      .update({
        close_price: trade.closePrice,
        profit_loss: trade.profitLoss || calculateProfitLoss(trade),
        status: 'closed',
        closed_at: trade.closeTime || new Date().toISOString()
      })
      .eq('account_id', account.id)
      .eq('platform_trade_id', trade.platformTradeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade:', error);
      return NextResponse.json(
        { error: 'Failed to update trade' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tradeId: updatedTrade?.id,
      message: 'Trade closure recorded'
    });

  } catch (error) {
    console.error('Error handling trade closed:', error);
    return NextResponse.json(
      { error: 'Failed to process trade closure' }, 
      { status: 500 }
    );
  }
}

async function handleTradeModified(tradeData: unknown, account: unknown, supabase: unknown) {
  try {
    // Update trade SL/TP
    const { error } = await supabase
      .from('trades')
      .update({
        stop_loss: trade.stopLoss,
        take_profit: trade.takeProfit
      })
      .eq('account_id', account.id)
      .eq('platform_trade_id', trade.platformTradeId);

    if (error) {
      console.error('Error modifying trade:', error);
      return NextResponse.json(
        { error: 'Failed to modify trade' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trade modification recorded'
    });

  } catch (error) {
    console.error('Error handling trade modified:', error);
    return NextResponse.json(
      { error: 'Failed to process trade modification' }, 
      { status: 500 }
    );
  }
}

async function handleHeartbeat(supabase: any, account: any) {
  try {
    // Update last sync time
    await supabase
      .from('trading_accounts')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', account.id);

    return NextResponse.json({
      success: true,
      serverTime: Date.now(),
      message: 'Heartbeat received'
    });

  } catch (error) {
    console.error('Error handling heartbeat:', error);
    return NextResponse.json(
      { error: 'Failed to process heartbeat' }, 
      { status: 500 }
    );
  }
}

async function processCopyMappings(masterTrade: unknown, supabase: unknown) {
  try {
    // Get all active copy mappings for this master account
    const { data: mappings } = await supabase
      .from('copy_mappings')
      .select(`
        id, slave_account_id, lot_scaling_type, lot_scaling_value,
        copy_symbols, ignore_symbols, max_lot_size, min_lot_size, copy_sl_tp,
        slave_account:trading_accounts!slave_account_id(id, account_number, account_type)
      `)
      .eq('master_account_id', masterTrade.account_id)
      .eq('is_active', true);

    if (!mappings || mappings.length === 0) return;

    for (const mapping of mappings) {
      // Check symbol filtering
      if (mapping.copy_symbols && mapping.copy_symbols.length > 0) {
        if (!mapping.copy_symbols.includes(masterTrade.symbol)) continue;
      }
      
      if (mapping.ignore_symbols && mapping.ignore_symbols.includes(masterTrade.symbol)) {
        continue;
      }

      // Calculate lot size based on scaling rules
      const scaledLotSize = calculateScaledLotSize(
        masterTrade.lot_size,
        mapping.lot_scaling_type,
        mapping.lot_scaling_value,
        mapping.max_lot_size,
        mapping.min_lot_size
      );

      // Create copy instruction
      const copyInstruction = {
        type: 'execute_trade',
        targetAccountNumber: mapping.slave_account.account_number,
        trade: {
          symbol: masterTrade.symbol,
          tradeType: masterTrade.trade_type,
          lotSize: scaledLotSize,
          stopLoss: mapping.copy_sl_tp ? masterTrade.stop_loss : undefined,
          takeProfit: mapping.copy_sl_tp ? masterTrade.take_profit : undefined,
          comment: `Copy from ${masterTrade.platform_trade_id}`
        },
        mappingId: mapping.id,
        masterTradeId: masterTrade.id
      };

      // Store copy instruction for slave account to pick up
      await supabase
        .from('copy_instructions')
        .insert({
          mapping_id: mapping.id,
          master_trade_id: masterTrade.id,
          instruction_data: copyInstruction,
          status: 'pending'
        });

      // Create copied_trades record
      await supabase
        .from('copied_trades')
        .insert({
          mapping_id: mapping.id,
          master_trade_id: masterTrade.id,
          copy_status: 'pending'
        });
    }

  } catch (error) {
    console.error('Error processing copy mappings:', error);
  }
}

function calculateScaledLotSize(
  originalLotSize: number,
  scalingType: string,
  scalingValue: number,
  maxLotSize?: number,
  minLotSize?: number
): number {
  let scaledSize: number;

  switch (scalingType) {
    case 'fixed':
      scaledSize = scalingValue;
      break;
    case 'percentage':
      scaledSize = originalLotSize * (scalingValue / 100);
      break;
    case 'balance_ratio':
      scaledSize = originalLotSize * scalingValue;
      break;
    default:
      scaledSize = originalLotSize;
  }

  // Apply min/max limits
  if (minLotSize && scaledSize < minLotSize) scaledSize = minLotSize;
  if (maxLotSize && scaledSize > maxLotSize) scaledSize = maxLotSize;

  return Math.round(scaledSize * 100) / 100;
}

function calculateProfitLoss(trade: any): number {
  if (!trade.closePrice || !trade.openPrice) return 0;
  
  const priceDiff = trade.tradeType === 'buy' 
    ? trade.closePrice - trade.openPrice
    : trade.openPrice - trade.closePrice;
  
  // Simplified P&L calculation
  return Math.round(priceDiff * trade.lotSize * 100000 * 100) / 100;
}