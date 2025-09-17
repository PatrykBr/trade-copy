import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Trade processing endpoint for serverless deployment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Process pending trades from queue
    const { data: pendingTrades, error } = await supabase
      .from('trade_execution_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching pending trades:', error);
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }

    let processed = 0;
    for (const trade of pendingTrades || []) {
      try {
        // Mark as processing
        await supabase
          .from('trade_execution_queue')
          .update({ status: 'processing' })
          .eq('id', trade.id);

        // Simulate trade execution (replace with actual platform API calls)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mark as completed
        await supabase
          .from('trade_execution_queue')
          .update({ 
            status: 'completed',
            executed_at: new Date().toISOString()
          })
          .eq('id', trade.id);

        processed++;

      } catch (error) {
        console.error(`Error processing trade ${trade.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('trade_execution_queue')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            attempts: (trade.attempts || 0) + 1
          })
          .eq('id', trade.id);
      }
    }

    return NextResponse.json({ 
      processed,
      total: pendingTrades?.length || 0
    });

  } catch (error) {
    console.error('Trade processor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'trade-processor'
  });
}