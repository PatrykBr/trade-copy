#!/usr/bin/env node

// Railway-optimized trade worker
const { createClient } = require('@supabase/supabase-js');

class RailwayTradeWorker {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.isProcessing = false;
    this.processedCount = 0;
    this.startTime = Date.now();
  }

  async start() {
    console.log('🚂 Railway Trade Worker started');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Railway Environment:', process.env.RAILWAY_ENVIRONMENT);
    
    // Process trade queue every 500ms (optimized for Railway)
    setInterval(() => this.processTradeQueue(), 500);
    
    // Health check every 30 seconds
    setInterval(() => this.reportHealth(), 30000);
    
    // Log stats every 5 minutes
    setInterval(() => this.logStats(), 300000);
    
    // Keep worker alive with health endpoint
    this.startHealthServer();
  }

  async processTradeQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { data: pendingTrades, error } = await this.supabase
        .from('trade_execution_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      if (pendingTrades && pendingTrades.length > 0) {
        console.log(`📋 Processing ${pendingTrades.length} pending trades`);
        
        for (const trade of pendingTrades) {
          await this.processTrade(trade);
        }
      }
    } catch (error) {
      console.error('Trade processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processTrade(trade) {
    const startTime = Date.now();
    
    try {
      // Mark as processing
      await this.supabase
        .from('trade_execution_queue')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString(),
          attempts: (trade.attempts || 0) + 1
        })
        .eq('id', trade.id);

      // Execute trade (call external VPS or simulate)
      const result = await this.executeTradeOnVPS(trade);
      
      const latency = Date.now() - startTime;
      this.processedCount++;
      
      if (result.success) {
        // Mark as completed
        await this.supabase
          .from('trade_execution_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            execution_latency_ms: latency
          })
          .eq('id', trade.id);

        console.log(`✅ Trade executed: ${trade.trade_params?.symbol || 'unknown'} in ${latency}ms`);
      } else {
        throw new Error(result.error || 'Trade execution failed');
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      const attempts = (trade.attempts || 0) + 1;
      const maxAttempts = trade.max_attempts || 3;

      if (attempts >= maxAttempts) {
        // Max attempts reached, mark as failed
        await this.supabase
          .from('trade_execution_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
            execution_latency_ms: latency
          })
          .eq('id', trade.id);

        console.error(`❌ Trade failed permanently: ${trade.trade_params?.symbol || 'unknown'}`, error.message);
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, attempts - 1) * 1000; // 1s, 2s, 4s...
        const retryTime = new Date(Date.now() + retryDelay);
        
        await this.supabase
          .from('trade_execution_queue')
          .update({
            status: 'pending',
            error_message: error.message,
            scheduled_at: retryTime.toISOString(),
            execution_latency_ms: latency
          })
          .eq('id', trade.id);

        console.warn(`⚠️  Trade retry ${attempts}/${maxAttempts}: ${trade.trade_params?.symbol || 'unknown'} (retry in ${retryDelay}ms)`);
      }
    }
  }

  async executeTradeOnVPS(trade) {
    try {
      // If external VPS API is configured
      if (process.env.EXTERNAL_VPS_API) {
        const response = await fetch(`${process.env.EXTERNAL_VPS_API}/execute-trade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VPS_API_KEY || 'default-key'}`
          },
          body: JSON.stringify({
            trade_id: trade.id,
            execution_type: trade.execution_type,
            trade_params: trade.trade_params,
            mapping_id: trade.mapping_id
          }),
          timeout: 15000 // 15 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`VPS API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
      
      // Simulate trade execution for demo/testing
      console.log(`🎭 Simulating trade execution for ${trade.trade_params?.symbol || 'unknown'}`);
      
      // Simulate realistic execution time
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 80)); // 20-100ms
      
      // Simulate 95% success rate
      if (Math.random() < 0.95) {
        return { 
          success: true, 
          platform_trade_id: `SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          execution_price: trade.trade_params?.open_price || 1.0000,
          slippage: Math.random() * 2,
          execution_time: Date.now()
        };
      } else {
        return { 
          success: false, 
          error: 'Simulated execution failure (network/market conditions)' 
        };
      }
      
    } catch (error) {
      console.error('Trade execution error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async reportHealth() {
    try {
      const health = {
        service: 'railway-trade-worker',
        status: 'healthy',
        uptime: process.uptime(),
        processed_trades: this.processedCount,
        trades_per_minute: this.processedCount / ((Date.now() - this.startTime) / 60000),
        memory_usage: process.memoryUsage(),
        environment: process.env.RAILWAY_ENVIRONMENT || 'local',
        last_check: new Date().toISOString()
      };

      // Store health in database (if table exists)
      try {
        await this.supabase
          .from('system_health')
          .upsert(health, { onConflict: 'service' });
      } catch (dbError) {
        // Table might not exist, that's okay
        console.log('Health data stored in memory (database table not available)');
      }

      console.log(`💚 Health check: ${this.processedCount} trades processed, ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB memory`);
    } catch (error) {
      console.error('Health report failed:', error);
    }
  }

  logStats() {
    const uptime = process.uptime();
    const tradesPerMinute = this.processedCount / (uptime / 60);
    const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    console.log(`📊 Worker Stats: ${this.processedCount} trades processed, ${tradesPerMinute.toFixed(2)} trades/min, ${memoryMB}MB memory, ${Math.round(uptime)}s uptime`);
  }

  startHealthServer() {
    // Create simple health endpoint to prevent Railway from sleeping
    const express = require('express');
    const app = express();
    
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        service: 'railway-trade-worker',
        uptime: process.uptime(),
        processed_trades: this.processedCount,
        trades_per_minute: this.processedCount / (process.uptime() / 60),
        memory_usage: process.memoryUsage(),
        environment: process.env.RAILWAY_ENVIRONMENT || 'local',
        timestamp: new Date().toISOString()
      });
    });

    app.get('/stats', (req, res) => {
      res.json({
        processed_trades: this.processedCount,
        uptime_seconds: process.uptime(),
        trades_per_minute: this.processedCount / (process.uptime() / 60),
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        is_processing: this.isProcessing,
        start_time: new Date(this.startTime).toISOString()
      });
    });
    
    const port = process.env.PORT || 3001;
    app.listen(port, '0.0.0.0', () => {
      console.log(`🏥 Worker health endpoint running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/health`);
      console.log(`   Stats:  http://localhost:${port}/stats`);
    });
  }
}

// Start the worker
if (require.main === module) {
  const worker = new RailwayTradeWorker();
  worker.start().catch(error => {
    console.error('Failed to start trade worker:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Worker shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 Worker interrupted, shutting down...');
    process.exit(0);
  });
}

module.exports = RailwayTradeWorker;