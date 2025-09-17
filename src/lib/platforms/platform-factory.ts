import { TradingPlatformService } from './base-platform';
import { MT4Service } from './mt4-service';
import { MT5Service } from './mt5-service';
import { createClient } from '@/lib/supabase/server';

export interface PlatformConnection {
  accountId: string;
  platformCode: string;
  service: TradingPlatformService;
  connected: boolean;
  lastPing: number;
  createdAt: Date;
}

export class PlatformFactory {
  private static instance: PlatformFactory;
  private connections = new Map<string, PlatformConnection>();
  private platformConfigs = new Map<string, any>();

  private constructor() {
    this.loadPlatformConfigs();
  }

  static getInstance(): PlatformFactory {
    if (!PlatformFactory.instance) {
      PlatformFactory.instance = new PlatformFactory();
    }
    return PlatformFactory.instance;
  }

  /**
   * Load platform configurations from database
   */
  private async loadPlatformConfigs(): Promise<void> {
    try {
      const supabase = await createClient();
      
      const { data: platforms, error } = await supabase
        .from('trading_platforms')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Failed to load platform configs:', error);
        return;
      }

      for (const platform of platforms || []) {
        this.platformConfigs.set(platform.code, {
          id: platform.id,
          name: platform.name,
          code: platform.code,
          api_endpoint: platform.api_endpoint,
          connection_timeout: platform.connection_timeout || 30,
          max_connections_per_vps: platform.max_connections_per_vps || 50,
          vps_config: platform.vps_config || {}
        });
      }

      console.log(`Loaded ${this.platformConfigs.size} platform configurations`);
    } catch (error) {
      console.error('Error loading platform configs:', error);
    }
  }

  /**
   * Create a platform service instance
   */
  createPlatformService(platformCode: string, accountId: string): TradingPlatformService | null {
    const config = this.platformConfigs.get(platformCode);
    if (!config) {
      console.error(`Platform configuration not found for: ${platformCode}`);
      return null;
    }

    switch (platformCode.toLowerCase()) {
      case 'mt4':
        return new MT4Service(accountId, config);
      
      case 'mt5':
        return new MT5Service(accountId, config);
      
      case 'ctrader':
        // TODO: Implement cTrader service
        console.warn('cTrader service not yet implemented');
        return null;
      
      default:
        console.error(`Unsupported platform: ${platformCode}`);
        return null;
    }
  }

  /**
   * Connect a trading account to its platform
   */
  async connectAccount(accountId: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      // Get account details
      const { data: account, error } = await supabase
        .from('trading_accounts')
        .select(`
          *,
          trading_platforms(*)
        `)
        .eq('id', accountId)
        .single();

      if (error || !account) {
        console.error('Account not found:', error);
        return false;
      }

      const platform = account.trading_platforms;
      if (!platform) {
        console.error('Platform not found for account');
        return false;
      }

      // Check if already connected
      if (this.connections.has(accountId)) {
        const existing = this.connections.get(accountId)!;
        if (existing.connected) {
          console.log(`Account ${accountId} already connected`);
          return true;
        }
      }

      // Create platform service
      const service = this.createPlatformService(platform.code, accountId);
      if (!service) {
        console.error(`Failed to create service for platform: ${platform.code}`);
        return false;
      }

      // Decrypt credentials
      const credentials = this.decryptCredentials(account.encrypted_credentials);
      if (!credentials) {
        console.error('Failed to decrypt account credentials');
        return false;
      }

      // Attempt connection
      const connected = await service.connect(credentials);
      
      if (connected) {
        // Store connection
        this.connections.set(accountId, {
          accountId,
          platformCode: platform.code,
          service,
          connected: true,
          lastPing: Date.now(),
          createdAt: new Date()
        });

        // Start monitoring for this account
        await this.startAccountMonitoring(accountId);
        
        console.log(`Account ${accountId} connected to ${platform.code} successfully`);
        return true;
      } else {
        console.error(`Failed to connect account ${accountId} to ${platform.code}`);
        return false;
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      return false;
    }
  }

  /**
   * Disconnect a trading account
   */
  async disconnectAccount(accountId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(accountId);
      if (!connection) {
        console.log(`Account ${accountId} not connected`);
        return true;
      }

      await connection.service.stopMonitoring();
      await connection.service.disconnect();
      
      this.connections.delete(accountId);
      
      console.log(`Account ${accountId} disconnected successfully`);
      return true;
    } catch (error) {
      console.error('Error disconnecting account:', error);
      return false;
    }
  }

  /**
   * Get platform service for an account
   */
  getService(accountId: string): TradingPlatformService | null {
    const connection = this.connections.get(accountId);
    return connection?.service || null;
  }

  /**
   * Check if account is connected
   */
  isConnected(accountId: string): boolean {
    const connection = this.connections.get(accountId);
    return connection?.connected || false;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): PlatformConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.connected);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): any {
    const connections = Array.from(this.connections.values());
    const byPlatform = connections.reduce((acc: any, conn) => {
      acc[conn.platformCode] = (acc[conn.platformCode] || 0) + 1;
      return acc;
    }, {});

    return {
      total: connections.length,
      connected: connections.filter(c => c.connected).length,
      byPlatform,
      averagePing: connections.length > 0 
        ? connections.reduce((sum, conn) => sum + conn.lastPing, 0) / connections.length 
        : 0
    };
  }

  /**
   * Health check all connections
   */
  async performHealthCheck(): Promise<void> {
    const connections = Array.from(this.connections.values());
    
    for (const connection of connections) {
      try {
        if (connection.connected) {
          const pingTime = await connection.service.ping();
          
          if (pingTime > 0) {
            connection.lastPing = pingTime;
          } else {
            // Connection failed, mark as disconnected
            connection.connected = false;
            console.warn(`Health check failed for account ${connection.accountId}`);
          }
        }
      } catch (error) {
        console.error(`Health check error for account ${connection.accountId}:`, error);
        connection.connected = false;
      }
    }
  }

  /**
   * Start monitoring for an account
   */
  private async startAccountMonitoring(accountId: string): Promise<void> {
    const connection = this.connections.get(accountId);
    if (!connection || !connection.service) return;

    // Set up trade event callback
    const eventCallback = (event: any) => {
      // Convert platform event to standardized trade event
      this.handlePlatformEvent(accountId, event);
    };

    await connection.service.startMonitoring(eventCallback);
  }

  /**
   * Handle platform-specific events and convert to standardized format
   */
  private async handlePlatformEvent(accountId: string, event: any): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { realTimeTradeEventSystem } = await import('@/lib/realtime/trade-event-system');
      
      // Convert platform event to standardized trade event
      const standardizedEvent = {
        account_id: accountId,
        event_type: this.mapEventType(event.type),
        platform_trade_id: event.platform_trade_id,
        symbol: event.symbol,
        trade_data: event.data,
        detected_at: event.timestamp,
        vps_id: null // Will be set by VPS connection manager
      };

      // Publish to real-time system
      await realTimeTradeEventSystem.publishTradeEvent(standardizedEvent);
      
    } catch (error) {
      console.error('Error handling platform event:', error);
    }
  }

  /**
   * Map platform-specific event types to standardized types
   */
  private mapEventType(platformEventType: string): string {
    const eventMap: { [key: string]: string } = {
      // MT4 events
      'trade_opened': 'trade_opened',
      'trade_closed': 'trade_closed',
      'trade_modified': 'trade_modified',
      
      // MT5 events
      'position_opened': 'trade_opened',
      'position_closed': 'trade_closed',
      'position_modified': 'trade_modified',
      'deal_executed': 'trade_opened',
      
      // Common events
      'order_placed': 'order_placed',
      'order_cancelled': 'order_cancelled'
    };

    return eventMap[platformEventType] || platformEventType;
  }

  /**
   * Decrypt account credentials
   */
  private decryptCredentials(encryptedCredentials: string | null): any {
    if (!encryptedCredentials) return null;
    
    try {
      // In production, implement proper encryption/decryption
      // For now, assume credentials are stored as JSON
      return JSON.parse(encryptedCredentials);
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      return null;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds

    console.log('Platform health monitoring started');
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    const connections = Array.from(this.connections.keys());
    
    for (const accountId of connections) {
      await this.disconnectAccount(accountId);
    }
    
    this.connections.clear();
    console.log('Platform factory cleanup completed');
  }
}

// Export singleton instance
export const platformFactory = PlatformFactory.getInstance();