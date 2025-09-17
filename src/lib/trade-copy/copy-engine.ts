import { createClient } from '@/lib/supabase/server';
import { realTimeTradeEventSystem, TradeEvent, TradeEventHandler } from '@/lib/realtime/trade-event-system';

export interface TradeExecutionRequest {
  id: string;
  priority: number;
  mapping_id: string;
  master_trade_event_id: string;
  slave_account_id: string;
  execution_type: 'open' | 'close' | 'modify';
  trade_params: {
    symbol: string;
    trade_type: 'buy' | 'sell';
    lot_size: number;
    open_price?: number;
    close_price?: number;
    stop_loss?: number;
    take_profit?: number;
    scaled_lot_size?: number;
    original_trade_id?: string;
  };
  scheduled_at: string;
  attempts: number;
  max_attempts: number;
}

export interface CopyMapping {
  id: string;
  user_id: string;
  master_account_id: string;
  slave_account_id: string;
  lot_scaling_type: 'fixed' | 'percentage' | 'balance_ratio';
  lot_scaling_value: number;
  copy_symbols: string[] | null;
  ignore_symbols: string[] | null;
  max_lot_size: number | null;
  min_lot_size: number | null;
  copy_sl_tp: boolean;
  is_active: boolean;
}

export interface ProtectionRule {
  id: string;
  user_id: string;
  account_id: string | null;
  rule_type: 'equity_drawdown' | 'daily_loss' | 'news_protection' | 'time_restriction';
  threshold_value: number | null;
  threshold_percentage: number | null;
  is_active: boolean;
  triggered_at: string | null;
}

export class TradeCopyEngine {
  private processingQueue = new Map<string, TradeExecutionRequest>();
  private executionWorkers: NodeJS.Timeout[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private processingInterval = 100; // Process every 100ms
  private performanceMetrics = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    averageLatencyMs: 0,
    latencySum: 0
  };

  constructor() {
    this.setupTradeEventHandlers();
    this.startProcessingWorkers();
  }

  /**
   * Setup trade event handlers to detect and queue copy operations
   */
  private setupTradeEventHandlers(): void {
    const tradeHandler: TradeEventHandler = {
      onTradeOpened: (event) => this.handleTradeOpened(event),
      onTradeClosed: (event) => this.handleTradeClosed(event),
      onTradeModified: (event) => this.handleTradeModified(event),
      onOrderPlaced: (event) => this.handleOrderPlaced(event),
      onOrderCancelled: (event) => this.handleOrderCancelled(event),
      onError: (error) => console.error('Trade copy engine error:', error)
    };

    realTimeTradeEventSystem.addTradeEventHandler(tradeHandler);
    console.log('Trade copy engine initialized and listening for events');
  }

  /**
   * Handle trade opened events
   */
  private async handleTradeOpened(event: TradeEvent): Promise<void> {
    try {
      console.log(`Processing trade opened event: ${event.symbol} on account ${event.account_id}`);
      
      // Get copy mappings for this master account
      const copyMappings = await this.getCopyMappingsForMasterAccount(event.account_id);
      
      for (const mapping of copyMappings) {
        // Check if copying is allowed for this symbol
        if (!this.isSymbolAllowed(event.symbol, mapping)) {
          console.log(`Symbol ${event.symbol} not allowed for copy mapping ${mapping.id}`);
          continue;
        }

        // Check protection rules
        if (await this.isProtectionTriggered(mapping)) {
          console.log(`Protection rule triggered for copy mapping ${mapping.id}`);
          continue;
        }

        // Calculate scaled lot size
        const scaledTradeParams = await this.scaleTradeParameters(event.trade_data, mapping);
        
        // Queue the copy trade
        await this.queueTradeExecution({
          mapping_id: mapping.id,
          master_trade_event_id: event.id,
          slave_account_id: mapping.slave_account_id,
          execution_type: 'open',
          trade_params: {
            ...scaledTradeParams,
            symbol: event.symbol,
            original_trade_id: event.platform_trade_id
          },
          priority: 1 // High priority for new trades
        });
      }
    } catch (error) {
      console.error('Error handling trade opened event:', error);
    }
  }

  /**
   * Handle trade closed events
   */
  private async handleTradeClosed(event: TradeEvent): Promise<void> {
    try {
      console.log(`Processing trade closed event: ${event.symbol} on account ${event.account_id}`);
      
      // Find existing copied trades that need to be closed
      const supabase = await createClient();
      
      const { data: copiedTrades, error } = await supabase
        .from('copied_trades')
        .select(`
          *,
          copy_mappings!inner(*),
          trades!slave_trade_id(*)
        `)
        .eq('copy_mappings.master_account_id', event.account_id)
        .eq('copy_status', 'success')
        .is('trades.closed_at', null); // Only open trades

      if (error) {
        console.error('Error fetching copied trades to close:', error);
        return;
      }

      for (const copiedTrade of copiedTrades || []) {
        const mapping = copiedTrade.copy_mappings as CopyMapping;
        
        // Queue the close operation
        await this.queueTradeExecution({
          mapping_id: mapping.id,
          master_trade_event_id: event.id,
          slave_account_id: mapping.slave_account_id,
          execution_type: 'close',
          trade_params: {
            symbol: event.symbol,
            trade_type: event.trade_data.trade_type,
            lot_size: event.trade_data.lot_size,
            close_price: event.trade_data.close_price,
            original_trade_id: event.platform_trade_id
          },
          priority: 2 // High priority for closing trades
        });
      }
    } catch (error) {
      console.error('Error handling trade closed event:', error);
    }
  }

  /**
   * Handle trade modified events (SL/TP changes)
   */
  private async handleTradeModified(event: TradeEvent): Promise<void> {
    try {
      if (!event.trade_data.stop_loss && !event.trade_data.take_profit) {
        return; // No SL/TP modification
      }

      console.log(`Processing trade modified event: ${event.symbol} on account ${event.account_id}`);
      
      const copyMappings = await this.getCopyMappingsForMasterAccount(event.account_id);
      
      for (const mapping of copyMappings) {
        if (!mapping.copy_sl_tp) {
          continue; // SL/TP copying disabled for this mapping
        }

        await this.queueTradeExecution({
          mapping_id: mapping.id,
          master_trade_event_id: event.id,
          slave_account_id: mapping.slave_account_id,
          execution_type: 'modify',
          trade_params: {
            symbol: event.symbol,
            trade_type: event.trade_data.trade_type,
            lot_size: event.trade_data.lot_size,
            stop_loss: event.trade_data.stop_loss,
            take_profit: event.trade_data.take_profit,
            original_trade_id: event.platform_trade_id
          },
          priority: 3 // Medium priority for modifications
        });
      }
    } catch (error) {
      console.error('Error handling trade modified event:', error);
    }
  }

  /**
   * Handle order placed events
   */
  private async handleOrderPlaced(event: TradeEvent): Promise<void> {
    // Handle pending orders if needed
    console.log(`Pending order placed: ${event.symbol} on account ${event.account_id}`);
  }

  /**
   * Handle order cancelled events
   */
  private async handleOrderCancelled(event: TradeEvent): Promise<void> {
    // Handle order cancellations if needed
    console.log(`Order cancelled: ${event.symbol} on account ${event.account_id}`);
  }

  /**
   * Queue a trade execution request
   */
  private async queueTradeExecution(params: {
    mapping_id: string;
    master_trade_event_id: string;
    slave_account_id: string;
    execution_type: 'open' | 'close' | 'modify';
    trade_params: any;
    priority: number;
  }): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Use database function for atomic queuing
      const { data: queueId, error } = await supabase.rpc('queue_trade_copy', {
        p_mapping_id: params.mapping_id,
        p_master_trade_event_id: params.master_trade_event_id,
        p_execution_type: params.execution_type,
        p_trade_params: params.trade_params,
        p_priority: params.priority
      });

      if (error) {
        console.error('Error queuing trade execution:', error);
        return;
      }

      console.log(`Trade execution queued: ${queueId} for ${params.execution_type} ${params.trade_params.symbol}`);
    } catch (error) {
      console.error('Error in queueTradeExecution:', error);
    }
  }

  /**
   * Start processing workers for queue execution
   */
  private startProcessingWorkers(): void {
    const workerCount = 3; // Multiple workers for parallel processing
    
    for (let i = 0; i < workerCount; i++) {
      const worker = setInterval(async () => {
        if (!this.isProcessing) {
          this.isProcessing = true;
          await this.processExecutionQueue();
          this.isProcessing = false;
        }
      }, this.processingInterval);
      
      this.executionWorkers.push(worker);
    }
    
    console.log(`Started ${workerCount} trade execution workers`);
  }

  /**
   * Process pending trade executions from queue
   */
  private async processExecutionQueue(): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Get pending executions by priority
      const { data: pendingExecutions, error } = await supabase
        .from('trade_execution_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('scheduled_at', { ascending: true })
        .limit(this.batchSize);

      if (error || !pendingExecutions?.length) {
        return;
      }

      // Process executions in parallel
      const executionPromises = pendingExecutions.map(execution => 
        this.executeTradeOperation(execution)
      );
      
      await Promise.allSettled(executionPromises);
    } catch (error) {
      console.error('Error processing execution queue:', error);
    }
  }

  /**
   * Execute a single trade operation
   */
  private async executeTradeOperation(execution: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      const supabase = await createClient();
      
      // Mark as processing
      await supabase
        .from('trade_execution_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          attempts: (execution.attempts || 0) + 1
        })
        .eq('id', execution.id);

      // Simulate trade execution (replace with actual platform API calls)
      const executionResult = await this.simulateTradeExecution(execution);
      
      const executionLatency = Date.now() - startTime;
      
      if (executionResult.success) {
        // Mark as completed
        await supabase
          .from('trade_execution_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            execution_latency_ms: executionLatency
          })
          .eq('id', execution.id);

        // Update performance metrics
        this.updatePerformanceMetrics(true, executionLatency);
        
        console.log(`Trade execution completed: ${execution.trade_params.symbol} in ${executionLatency}ms`);
      } else {
        throw new Error(executionResult.error);
      }
      
    } catch (error) {
      const executionLatency = Date.now() - startTime;
      
      // Handle failure
      await this.handleExecutionFailure(execution, error instanceof Error ? error.message : 'Unknown error');
      this.updatePerformanceMetrics(false, executionLatency);
      
      console.error(`Trade execution failed: ${execution.trade_params.symbol}`, error);
    }
  }

  /**
   * Simulate trade execution (replace with actual platform integration)
   */
  private async simulateTradeExecution(execution: any): Promise<{ success: boolean; error?: string }> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5)); // 5-25ms
    
    // Simulate 95% success rate
    if (Math.random() < 0.95) {
      return { success: true };
    } else {
      return { success: false, error: 'Simulated execution failure' };
    }
  }

  /**
   * Handle execution failure with retry logic
   */
  private async handleExecutionFailure(execution: any, errorMessage: string): Promise<void> {
    try {
      const supabase = await createClient();
      
      if ((execution.attempts || 0) >= (execution.max_attempts || 3)) {
        // Max attempts reached, mark as failed
        await supabase
          .from('trade_execution_queue')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, execution.attempts || 0) * 1000; // 1s, 2s, 4s...
        const retryTime = new Date(Date.now() + retryDelay);
        
        await supabase
          .from('trade_execution_queue')
          .update({
            status: 'pending',
            error_message: errorMessage,
            scheduled_at: retryTime.toISOString()
          })
          .eq('id', execution.id);
      }
    } catch (error) {
      console.error('Error handling execution failure:', error);
    }
  }

  /**
   * Get copy mappings for a master account
   */
  private async getCopyMappingsForMasterAccount(accountId: string | null): Promise<CopyMapping[]> {
    if (!accountId) return [];
    
    try {
      const supabase = await createClient();
      
      const { data: mappings, error } = await supabase
        .from('copy_mappings')
        .select('*')
        .eq('master_account_id', accountId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching copy mappings:', error);
        return [];
      }

      return mappings || [];
    } catch (error) {
      console.error('Error in getCopyMappingsForMasterAccount:', error);
      return [];
    }
  }

  /**
   * Check if symbol is allowed for copying
   */
  private isSymbolAllowed(symbol: string, mapping: CopyMapping): boolean {
    // Check ignore list first
    if (mapping.ignore_symbols && mapping.ignore_symbols.includes(symbol)) {
      return false;
    }
    
    // Check copy list (if specified, only copy these symbols)
    if (mapping.copy_symbols && mapping.copy_symbols.length > 0) {
      return mapping.copy_symbols.includes(symbol);
    }
    
    // If no specific copy list, allow all symbols not in ignore list
    return true;
  }

  /**
   * Check if protection rules are triggered
   */
  private async isProtectionTriggered(mapping: CopyMapping): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      const { data: rules, error } = await supabase
        .from('protection_rules')
        .select('*')
        .eq('user_id', mapping.user_id)
        .eq('is_active', true)
        .is('triggered_at', null);

      if (error) {
        console.error('Error checking protection rules:', error);
        return false;
      }

      // For now, just check if any protection rules exist
      // In production, implement actual protection logic
      return false;
    } catch (error) {
      console.error('Error in isProtectionTriggered:', error);
      return false;
    }
  }

  /**
   * Scale trade parameters based on copy mapping configuration
   */
  private async scaleTradeParameters(tradeData: any, mapping: CopyMapping): Promise<any> {
    let scaledLotSize = tradeData.lot_size;

    switch (mapping.lot_scaling_type) {
      case 'fixed':
        scaledLotSize = mapping.lot_scaling_value;
        break;
        
      case 'percentage':
        scaledLotSize = tradeData.lot_size * (mapping.lot_scaling_value / 100);
        break;
        
      case 'balance_ratio':
        // Would need account balances for this calculation
        scaledLotSize = tradeData.lot_size * mapping.lot_scaling_value;
        break;
    }

    // Apply min/max lot size limits
    if (mapping.min_lot_size && scaledLotSize < mapping.min_lot_size) {
      scaledLotSize = mapping.min_lot_size;
    }
    
    if (mapping.max_lot_size && scaledLotSize > mapping.max_lot_size) {
      scaledLotSize = mapping.max_lot_size;
    }

    return {
      ...tradeData,
      scaled_lot_size: scaledLotSize,
      lot_size: scaledLotSize
    };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(success: boolean, latencyMs: number): void {
    this.performanceMetrics.totalProcessed++;
    
    if (success) {
      this.performanceMetrics.successCount++;
    } else {
      this.performanceMetrics.failureCount++;
    }
    
    this.performanceMetrics.latencySum += latencyMs;
    this.performanceMetrics.averageLatencyMs = 
      this.performanceMetrics.latencySum / this.performanceMetrics.totalProcessed;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): any {
    return {
      ...this.performanceMetrics,
      successRate: this.performanceMetrics.totalProcessed > 0 
        ? (this.performanceMetrics.successCount / this.performanceMetrics.totalProcessed) * 100 
        : 0,
      queueSize: this.processingQueue.size
    };
  }

  /**
   * Cleanup and stop processing
   */
  destroy(): void {
    // Stop all workers
    this.executionWorkers.forEach(worker => clearInterval(worker));
    this.executionWorkers = [];
    
    // Clear processing queue
    this.processingQueue.clear();
    
    console.log('Trade copy engine stopped');
  }
}

// Export singleton instance
export const tradeCopyEngine = new TradeCopyEngine();