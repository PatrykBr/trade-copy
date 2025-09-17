import { TradingPlatformService, TradeOrder, TradeResult, AccountInfo, Position, MarketData } from './base-platform';

export class MT4Service extends TradingPlatformService {
  private connection: any = null;
  private monitoring = false;
  private monitoringCallback?: (event: any) => void;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(accountId: string, platformConfig: any) {
    super(accountId, platformConfig);
  }

  async connect(credentials: any): Promise<boolean> {
    try {
      console.log(`Connecting MT4 account ${credentials.login} to ${credentials.server}`);
      
      // In production, this would establish actual MT4 connection
      // For now, simulate connection process
      await this.simulateConnection(credentials);
      
      this.connection = {
        login: credentials.login,
        server: credentials.server,
        connected_at: new Date(),
        last_ping: new Date()
      };

      // Start heartbeat to maintain connection
      this.startHeartbeat();
      
      console.log(`MT4 account ${credentials.login} connected successfully`);
      return true;
    } catch (error) {
      console.error('MT4 connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }
      
      await this.stopMonitoring();
      this.connection = null;
      
      console.log(`MT4 account ${this.accountId} disconnected`);
      return true;
    } catch (error) {
      console.error('MT4 disconnect failed:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  async ping(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate ping to MT4 server
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
      
      if (this.connection) {
        this.connection.last_ping = new Date();
      }
      
      return Date.now() - startTime;
    } catch (error) {
      console.error('MT4 ping failed:', error);
      return -1;
    }
  }

  async openTrade(order: TradeOrder): Promise<TradeResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected()) {
        throw new Error('MT4 not connected');
      }

      console.log(`Opening MT4 trade: ${order.symbol} ${order.trade_type} ${order.lot_size}`);
      
      // Simulate trade execution
      const result = await this.simulateTradeExecution(order);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        platform_trade_id: result.ticket,
        actual_price: result.price,
        execution_time_ms: executionTime,
        slippage_points: result.slippage
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('MT4 trade execution failed:', error);
      
      return {
        success: false,
        execution_time_ms: executionTime,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async closeTrade(platform_trade_id: string, lot_size?: number): Promise<TradeResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected()) {
        throw new Error('MT4 not connected');
      }

      console.log(`Closing MT4 trade: ${platform_trade_id} ${lot_size ? `lot_size: ${lot_size}` : ''}`);
      
      // Simulate trade closing
      const result = await this.simulateTradeClosing(platform_trade_id, lot_size);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        platform_trade_id: result.ticket,
        actual_price: result.close_price,
        execution_time_ms: executionTime,
        slippage_points: result.slippage
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('MT4 trade closing failed:', error);
      
      return {
        success: false,
        execution_time_ms: executionTime,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async modifyTrade(platform_trade_id: string, stop_loss?: number, take_profit?: number): Promise<TradeResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected()) {
        throw new Error('MT4 not connected');
      }

      console.log(`Modifying MT4 trade: ${platform_trade_id} SL: ${stop_loss} TP: ${take_profit}`);
      
      // Simulate trade modification
      await this.simulateTradeModification(platform_trade_id, stop_loss, take_profit);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        platform_trade_id: platform_trade_id,
        execution_time_ms: executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('MT4 trade modification failed:', error);
      
      return {
        success: false,
        execution_time_ms: executionTime,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    try {
      if (!this.isConnected()) {
        throw new Error('MT4 not connected');
      }

      // Simulate account info retrieval
      const mockAccountInfo: AccountInfo = {
        account_number: this.connection.login,
        balance: 10000 + Math.random() * 5000,
        equity: 10000 + Math.random() * 5000,
        margin: Math.random() * 1000,
        free_margin: 9000 + Math.random() * 4000,
        currency: 'USD',
        leverage: 100,
        server: this.connection.server
      };

      return mockAccountInfo;
    } catch (error) {
      console.error('Failed to get MT4 account info:', error);
      throw error;
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      if (!this.isConnected()) {
        throw new Error('MT4 not connected');
      }

      // Simulate positions retrieval
      const mockPositions: Position[] = [
        {
          platform_trade_id: '12345',
          symbol: 'EURUSD',
          trade_type: 'buy',
          lot_size: 0.1,
          open_price: 1.0850,
          current_price: 1.0875,
          profit_loss: 25.0,
          swap: -0.5,
          commission: -2.0,
          opened_at: new Date(Date.now() - 3600000), // 1 hour ago
          comment: 'Copy from master'
        }
      ];

      return mockPositions;
    } catch (error) {
      console.error('Failed to get MT4 positions:', error);
      throw error;
    }
  }

  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    try {
      if (!this.isConnected()) {
        throw new Error('MT4 not connected');
      }

      // Simulate market data retrieval
      const marketData: MarketData[] = symbols.map(symbol => ({
        symbol,
        bid: 1.0850 + Math.random() * 0.01,
        ask: 1.0853 + Math.random() * 0.01,
        spread: 3 + Math.random() * 2,
        timestamp: Date.now()
      }));

      return marketData;
    } catch (error) {
      console.error('Failed to get MT4 market data:', error);
      throw error;
    }
  }

  async startMonitoring(callback: (event: any) => void): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        throw new Error('MT4 not connected');
      }

      this.monitoringCallback = callback;
      this.monitoring = true;
      
      // Simulate trade monitoring
      this.simulateTradeMonitoring();
      
      console.log(`MT4 monitoring started for account ${this.accountId}`);
      return true;
    } catch (error) {
      console.error('Failed to start MT4 monitoring:', error);
      return false;
    }
  }

  async stopMonitoring(): Promise<boolean> {
    try {
      this.monitoring = false;
      this.monitoringCallback = undefined;
      
      console.log(`MT4 monitoring stopped for account ${this.accountId}`);
      return true;
    } catch (error) {
      console.error('Failed to stop MT4 monitoring:', error);
      return false;
    }
  }

  // Private simulation methods
  private async simulateConnection(credentials: any): Promise<void> {
    // Simulate connection latency
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate 95% success rate
    if (Math.random() < 0.05) {
      throw new Error('Connection failed - Invalid credentials or server unreachable');
    }
  }

  private async simulateTradeExecution(order: TradeOrder): Promise<any> {
    // Simulate execution latency
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
    
    // Simulate 98% success rate
    if (Math.random() < 0.02) {
      throw new Error('Trade rejected - Market closed or insufficient margin');
    }
    
    return {
      ticket: `MT4_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      price: order.open_price || (1.0850 + Math.random() * 0.01),
      slippage: Math.random() * 2 // 0-2 points slippage
    };
  }

  private async simulateTradeClosing(platform_trade_id: string, lot_size?: number): Promise<any> {
    // Simulate execution latency
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
    
    // Simulate 98% success rate
    if (Math.random() < 0.02) {
      throw new Error('Trade close rejected - Position not found or market closed');
    }
    
    return {
      ticket: platform_trade_id,
      close_price: 1.0875 + Math.random() * 0.01,
      slippage: Math.random() * 2
    };
  }

  private async simulateTradeModification(platform_trade_id: string, stop_loss?: number, take_profit?: number): Promise<void> {
    // Simulate execution latency
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 20));
    
    // Simulate 99% success rate for modifications
    if (Math.random() < 0.01) {
      throw new Error('Trade modification rejected - Invalid levels or market closed');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.isConnected()) {
        await this.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private simulateTradeMonitoring(): void {
    if (!this.monitoring || !this.monitoringCallback) return;
    
    // Simulate random trade events
    setTimeout(() => {
      if (this.monitoring && this.monitoringCallback) {
        // Random event generation
        const events = ['trade_opened', 'trade_closed', 'trade_modified'];
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
        
        if (Math.random() < 0.3) { // 30% chance of event
          const event = {
            type: events[Math.floor(Math.random() * events.length)],
            symbol: symbols[Math.floor(Math.random() * symbols.length)],
            platform_trade_id: `MT4_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            data: {
              trade_type: Math.random() > 0.5 ? 'buy' : 'sell',
              lot_size: 0.1 + Math.random() * 0.9,
              price: 1.0850 + Math.random() * 0.01
            }
          };
          
          this.monitoringCallback(event);
        }
        
        // Continue monitoring
        this.simulateTradeMonitoring();
      }
    }, 1000 + Math.random() * 4000); // Random interval 1-5 seconds
  }
}