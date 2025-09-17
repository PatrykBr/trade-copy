import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// VPS monitoring endpoint for serverless deployment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all active VPS instances
    const { data: vpsInstances, error } = await supabase
      .from('vps_instances')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching VPS instances:', error);
      return NextResponse.json({ error: 'Failed to fetch VPS instances' }, { status: 500 });
    }

    let healthChecked = 0;
    for (const vps of vpsInstances || []) {
      try {
        // Simulate health check (replace with actual VPS API calls)
        const healthStatus = Math.random() > 0.1 ? 'healthy' : 'warning';
        const cpuUsage = Math.random() * 100;
        const memoryUsage = Math.random() * 100;

        // Update VPS health status
        await supabase
          .from('vps_instances')
          .update({
            health_status: healthStatus,
            cpu_usage: cpuUsage,
            memory_usage: memoryUsage,
            health_last_checked: new Date().toISOString()
          })
          .eq('id', vps.id);

        // Log health check
        await supabase
          .from('connection_health_logs')
          .insert({
            vps_id: vps.id,
            status: healthStatus,
            health_data: {
              cpu_usage: cpuUsage,
              memory_usage: memoryUsage,
              ip_address: vps.ip_address
            }
          });

        healthChecked++;

      } catch (error) {
        console.error(`Error checking VPS ${vps.id}:`, error);
        
        // Mark VPS as unhealthy
        await supabase
          .from('vps_instances')
          .update({
            health_status: 'critical',
            health_last_checked: new Date().toISOString()
          })
          .eq('id', vps.id);
      }
    }

    return NextResponse.json({ 
      healthChecked,
      total: vpsInstances?.length || 0
    });

  } catch (error) {
    console.error('VPS monitor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'vps-monitor'
  });
}