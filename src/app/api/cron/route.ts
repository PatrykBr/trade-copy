import { NextRequest, NextResponse } from 'next/server';

// Cron endpoint to trigger worker processes for serverless deployment
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task } = await request.json();

    if (task === 'process-trades') {
      // Trigger trade processing
      const response = await fetch(`${request.nextUrl.origin}/api/worker/trade-processor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      return NextResponse.json({ 
        task: 'process-trades',
        result 
      });
    }

    if (task === 'monitor-vps') {
      // Trigger VPS monitoring
      const response = await fetch(`${request.nextUrl.origin}/api/worker/vps-monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      return NextResponse.json({ 
        task: 'monitor-vps',
        result 
      });
    }

    if (task === 'all') {
      // Run both tasks
      const [tradesResponse, vpsResponse] = await Promise.all([
        fetch(`${request.nextUrl.origin}/api/worker/trade-processor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${request.nextUrl.origin}/api/worker/vps-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [tradesResult, vpsResult] = await Promise.all([
        tradesResponse.json(),
        vpsResponse.json()
      ]);

      return NextResponse.json({
        task: 'all',
        results: {
          trades: tradesResult,
          vps: vpsResult
        }
      });
    }

    return NextResponse.json({ error: 'Invalid task' }, { status: 400 });

  } catch (error) {
    console.error('Cron endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cron-scheduler',
    availableTasks: ['process-trades', 'monitor-vps', 'all']
  });
}