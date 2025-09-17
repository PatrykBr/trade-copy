import { createClient } from '@/lib/supabase/client';

// Define trade event types directly
export interface TradeEvent {
  id: string;
  account_id: string | null;
  vps_id: string | null;
  event_type: 'trade_opened' | 'trade_closed' | 'trade_modified' | 'order_placed' | 'order_cancelled';
  platform_trade_id: string;
  symbol: string;
  trade_data: any;
  detected_at: string;
  processed_at: string | null;
  copy_latency_ms: number | null;
  created_at: string | null;
}

export interface TradeEventInsert {
  account_id?: string | null;
  vps_id?: string | null;
  event_type: string;
  platform_trade_id: string;
  symbol: string;
  trade_data: any;
  detected_at?: string;
  processed_at?: string | null;
  copy_latency_ms?: number | null;
}

export interface TradeEventHandler {
  onTradeOpened: (event: TradeEvent) => void;
  onTradeClosed: (event: TradeEvent) => void;
  onTradeModified: (event: TradeEvent) => void;
  onOrderPlaced: (event: TradeEvent) => void;
  onOrderCancelled: (event: TradeEvent) => void;
  onError: (error: string) => void;
}

export interface SystemEventHandler {
  onVPSStatusChange: (vpsId: string, status: string) => void;
  onAccountConnection: (accountId: string, status: string) => void;
  onSystemAlert: (alert: any) => void;
}

export class RealTimeTradeEventSystem {
  private supabase;
  private tradeSubscription: any = null;
  private vpsSubscription: any = null;
  private accountSubscription: any = null;
  private eventHandlers: TradeEventHandler[] = [];
  private systemHandlers: SystemEventHandler[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.supabase = createClient();
    this.setupRealtimeConnection();
  }

  /**
   * Setup WebSocket connection with Supabase Realtime
   */
  private async setupRealtimeConnection(): Promise<void> {
    try {
      console.log('Setting up real-time trade event system...');

      // Subscribe to trade events
      this.tradeSubscription = this.supabase
        .channel('trade_events_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trade_events'
          },
          (payload) => this.handleTradeEvent(payload.new as TradeEvent)
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trade_events'
          },
          (payload) => this.handleTradeEvent(payload.new as TradeEvent)
        )
        .subscribe((status) => {
          console.log('Trade events subscription status:', status);
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('✅ Real-time trade events connected');
          } else if (status === 'CLOSED') {
            this.isConnected = false;
            this.handleReconnection();
          }
        });

      // Subscribe to VPS status changes
      this.vpsSubscription = this.supabase
        .channel('vps_status_channel')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vps_instances'
          },
          (payload) => this.handleVPSStatusChange(payload.new as any)
        )
        .subscribe((status) => {
          console.log('VPS status subscription status:', status);
        });

      // Subscribe to account connection changes
      this.accountSubscription = this.supabase
        .channel('account_connection_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'account_vps_assignments'
          },
          (payload) => this.handleAccountConnectionChange(payload)
        )
        .subscribe((status) => {
          console.log('Account connection subscription status:', status);
        });

    } catch (error) {
      console.error('Failed to setup real-time connection:', error);
      this.handleReconnection();
    }
  }

  /**
   * Handle incoming trade events and route to appropriate handlers
   */
  private handleTradeEvent(event: TradeEvent): void {
    const latencyMs = Date.now() - new Date(event.detected_at).getTime();
    
    // Log latency for monitoring
    console.log(`Trade event received - Type: ${event.event_type}, Latency: ${latencyMs}ms, Symbol: ${event.symbol}`);

    // Update latency in database for analytics
    this.updateEventLatency(event.id, latencyMs);

    // Route to appropriate handlers
    this.eventHandlers.forEach(handler => {
      try {
        switch (event.event_type) {
          case 'trade_opened':
            handler.onTradeOpened(event);
            break;
          case 'trade_closed':
            handler.onTradeClosed(event);
            break;
          case 'trade_modified':
            handler.onTradeModified(event);
            break;
          case 'order_placed':
            handler.onOrderPlaced(event);
            break;
          case 'order_cancelled':
            handler.onOrderCancelled(event);
            break;
          default:
            console.warn('Unknown trade event type:', event.event_type);
        }
      } catch (error) {
        console.error('Error in trade event handler:', error);
        handler.onError(`Handler error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle VPS status changes
   */
  private handleVPSStatusChange(vps: any): void {
    console.log(`VPS ${vps.name} status changed to: ${vps.status}`);
    
    this.systemHandlers.forEach(handler => {
      try {
        handler.onVPSStatusChange(vps.id, vps.status);
      } catch (error) {
        console.error('Error in VPS status handler:', error);
      }
    });
  }

  /**
   * Handle account connection changes
   */
  private handleAccountConnectionChange(payload: any): void {
    const assignment = payload.new || payload.old;
    const eventType = payload.eventType;
    
    console.log(`Account ${assignment.account_id} connection ${eventType}: ${assignment.status}`);
    
    this.systemHandlers.forEach(handler => {
      try {
        handler.onAccountConnection(assignment.account_id, assignment.status);
      } catch (error) {
        console.error('Error in account connection handler:', error);
      }
    });
  }

  /**
   * Update event latency for monitoring
   */
  private async updateEventLatency(eventId: string, latencyMs: number): Promise<void> {
    try {
      await this.supabase
        .from('trade_events')
        .update({ 
          copy_latency_ms: latencyMs,
          processed_at: new Date().toISOString()
        })
        .eq('id', eventId);
    } catch (error) {
      console.error('Failed to update event latency:', error);
    }
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Manual intervention required.');
      this.eventHandlers.forEach(handler => {
        handler.onError('Connection lost. Max reconnection attempts reached.');
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(() => {
      this.disconnect();
      this.setupRealtimeConnection();
    }, delay);
  }

  /**
   * Publish a trade event to the real-time system
   */
  async publishTradeEvent(event: TradeEventInsert): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('trade_events')
        .insert({
          ...event,
          detected_at: event.detected_at || new Date().toISOString()
        });

      if (error) {
        console.error('Failed to publish trade event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error publishing trade event:', error);
      return false;
    }
  }

  /**
   * Register a trade event handler
   */
  addTradeEventHandler(handler: TradeEventHandler): void {
    this.eventHandlers.push(handler);
    console.log(`Trade event handler registered. Total handlers: ${this.eventHandlers.length}`);
  }

  /**
   * Remove a trade event handler
   */
  removeTradeEventHandler(handler: TradeEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
      console.log(`Trade event handler removed. Total handlers: ${this.eventHandlers.length}`);
    }
  }

  /**
   * Register a system event handler
   */
  addSystemEventHandler(handler: SystemEventHandler): void {
    this.systemHandlers.push(handler);
    console.log(`System event handler registered. Total handlers: ${this.systemHandlers.length}`);
  }

  /**
   * Remove a system event handler
   */
  removeSystemEventHandler(handler: SystemEventHandler): void {
    const index = this.systemHandlers.indexOf(handler);
    if (index > -1) {
      this.systemHandlers.splice(index, 1);
      console.log(`System event handler removed. Total handlers: ${this.systemHandlers.length}`);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get real-time statistics
   */
  async getRealtimeStats(): Promise<any> {
    try {
      const { data: stats, error } = await this.supabase
        .from('trade_events')
        .select('copy_latency_ms, detected_at, processed_at')
        .not('copy_latency_ms', 'is', null)
        .gte('detected_at', new Date(Date.now() - 60000).toISOString()) // Last minute
        .order('detected_at', { ascending: false });

      if (error) throw error;

      const latencies = stats?.map(s => s.copy_latency_ms).filter(Boolean) || [];
      
      return {
        totalEvents: stats?.length || 0,
        averageLatencyMs: latencies.length > 0 
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
          : 0,
        maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
        minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : 0,
        connectionStatus: this.isConnected ? 'connected' : 'disconnected',
        reconnectAttempts: this.reconnectAttempts
      };
    } catch (error) {
      console.error('Failed to get realtime stats:', error);
      return null;
    }
  }

  /**
   * Disconnect from real-time system
   */
  disconnect(): void {
    if (this.tradeSubscription) {
      this.supabase.removeChannel(this.tradeSubscription);
      this.tradeSubscription = null;
    }
    
    if (this.vpsSubscription) {
      this.supabase.removeChannel(this.vpsSubscription);
      this.vpsSubscription = null;
    }
    
    if (this.accountSubscription) {
      this.supabase.removeChannel(this.accountSubscription);
      this.accountSubscription = null;
    }
    
    this.isConnected = false;
    console.log('Real-time trade event system disconnected');
  }
}

// Export singleton instance
export const realTimeTradeEventSystem = new RealTimeTradeEventSystem();