import { TradingPlatformService, TradeOrder, TradeResult, AccountInfo, Position, MarketData } from './base-platform';

export class MT5Service extends TradingPlatformService {
  private connection: any = null;
  private monitoring = false;
  private monitoringCallback?: (event: any) => void;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(accountId: string, platformConfig: any) {
    super(accountId, platformConfig);
  }

  async connect(credentials: any): Promise<boolean> {
    try {
      console.log(`Connecting MT5 account ${credentials.login} to ${credentials.server}`);
      
      // In production, this would establish actual MT5 connection via Gateway API
      await this.simulateConnection(credentials);
      
      this.connection = {
        login: credentials.login,
        server: credentials.server,
        connected_at: new Date(),
        last_ping: new Date(),
        gateway_version: '5.0.3815' // MT5 Gateway version
      };

      this.startHeartbeat();
      
      console.log(`MT5 account ${credentials.login} connected successfully`);
      return true;
    } catch (error) {
      console.error('MT5 connection failed:', error);
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
      
      console.log(`MT5 account ${this.accountId} disconnected`);
      return true;
    } catch (error) {
      console.error('MT5 disconnect failed:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  async ping(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate ping to MT5 gateway
      await new Promise(resolve => setTimeout(resolve, Math.random() * 8 + 3)); // Slightly faster than MT4
      
      if (this.connection) {
        this.connection.last_ping = new Date();
      }
      
      return Date.now() - startTime;
    } catch (error) {
      console.error('MT5 ping failed:', error);
      return -1;
    }
  }

  async openTrade(order: TradeOrder): Promise<TradeResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected()) {
        throw new Error('MT5 not connected');
      }

      console.log(`Opening MT5 trade: ${order.symbol} ${order.trade_type} ${order.lot_size}`);
      
      // MT5 has more sophisticated order execution
      const result = await this.simulateAdvancedTradeExecution(order);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        platform_trade_id: result.position_id,
        actual_price: result.price,
        execution_time_ms: executionTime,
        slippage_points: result.slippage
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('MT5 trade execution failed:', error);
      
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
        throw new Error('MT5 not connected');
      }

      console.log(`Closing MT5 position: ${platform_trade_id} ${lot_size ? `volume: ${lot_size}` : ''}`);
      
      const result = await this.simulatePositionClosing(platform_trade_id, lot_size);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        platform_trade_id: result.deal_id,
        actual_price: result.close_price,
        execution_time_ms: executionTime,
        slippage_points: result.slippage
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('MT5 position closing failed:', error);
      
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
        throw new Error('MT5 not connected');
      }

      console.log(`Modifying MT5 position: ${platform_trade_id} SL: ${stop_loss} TP: ${take_profit}`);
      
      await this.simulatePositionModification(platform_trade_id, stop_loss, take_profit);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        platform_trade_id: platform_trade_id,
        execution_time_ms: executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('MT5 position modification failed:', error);
      
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
        throw new Error('MT5 not connected');
      }

      // MT5 provides more detailed account information
      const mockAccountInfo: AccountInfo = {
        account_number: this.connection.login,
        balance: 15000 + Math.random() * 10000,
        equity: 15000 + Math.random() * 10000,
        margin: Math.random() * 2000,
        free_margin: 13000 + Math.random() * 8000,
        currency: 'USD',
        leverage: 500, // MT5 typically has higher leverage
        server: this.connection.server
      };

      return mockAccountInfo;
    } catch (error) {
      console.error('Failed to get MT5 account info:', error);
      throw error;
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      if (!this.isConnected()) {
        throw new Error('MT5 not connected');
      }

      // MT5 positions (different from MT4 orders/tickets)
      const mockPositions: Position[] = [
        {
          platform_trade_id: `${Date.now()}001`, // MT5 position ID
          symbol: 'EURUSD',
          trade_type: 'buy',
          lot_size: 0.2,
          open_price: 1.0845,
          current_price: 1.0870,
          profit_loss: 50.0,
          swap: -1.2,
          commission: -4.0,
          opened_at: new Date(Date.now() - 7200000), // 2 hours ago
          comment: 'Copied trade from master MT5'
        },
        {
          platform_trade_id: `${Date.now()}002`,
          symbol: 'GBPUSD',
          trade_type: 'sell',
          lot_size: 0.15,
          open_price: 1.2650,
          current_price: 1.2635,
          profit_loss: 22.5,
          swap: 0.8,
          commission: -3.0,
          opened_at: new Date(Date.now() - 1800000), // 30 minutes ago
          comment: 'Auto copy'
        }
      ];

      return mockPositions;
    } catch (error) {
      console.error('Failed to get MT5 positions:', error);
      throw error;
    }
  }

  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    try {
      if (!this.isConnected()) {
        throw new Error('MT5 not connected');
      }

      // MT5 has more precise market data
      const marketData: MarketData[] = symbols.map(symbol => {
        const base = symbol === 'EURUSD' ? 1.0850 : 
                     symbol === 'GBPUSD' ? 1.2650 : 
                     symbol === 'USDJPY' ? 149.50 : 1.0850;
        
        return {
          symbol,
          bid: base + Math.random() * 0.005 - 0.0025,
          ask: base + Math.random() * 0.005 - 0.0025 + 0.0001,
          spread: 1.5 + Math.random() * 1.5, // Typically tighter spreads on MT5
          timestamp: Date.now()
        };
      });

      return marketData;
    } catch (error) {
      console.error('Failed to get MT5 market data:', error);
      throw error;
    }
  }

  async startMonitoring(callback: (event: any) => void): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        throw new Error('MT5 not connected');
      }

      this.monitoringCallback = callback;
      this.monitoring = true;
      
      // MT5 has more comprehensive event monitoring
      this.simulateAdvancedTradeMonitoring();
      
      console.log(`MT5 monitoring started for account ${this.accountId}`);
      return true;
    } catch (error) {
      console.error('Failed to start MT5 monitoring:', error);
      return false;
    }
  }

  async stopMonitoring(): Promise<boolean> {
    try {
      this.monitoring = false;
      this.monitoringCallback = undefined;
      
      console.log(`MT5 monitoring stopped for account ${this.accountId}`);
      return true;
    } catch (error) {
      console.error('Failed to stop MT5 monitoring:', error);
      return false;
    }
  }

  // Private simulation methods (enhanced for MT5)
  private async simulateConnection(credentials: any): Promise<void> {
    // MT5 connection is typically faster
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    
    // Simulate 97% success rate (slightly better than MT4)
    if (Math.random() < 0.03) {
      throw new Error('Connection failed - Invalid credentials, server maintenance, or network issue');
    }
  }

  private async simulateAdvancedTradeExecution(order: TradeOrder): Promise<any> {
    // MT5 has faster execution
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 25));
    
    // MT5 has better execution success rate
    if (Math.random() < 0.01) {
      throw new Error('Order rejected - Insufficient margin, market closed, or invalid parameters');
    }
    
    return {
      position_id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, // MT5 uses position IDs
      price: order.open_price || (1.0850 + Math.random() * 0.008 - 0.004),
      slippage: Math.random() * 1.5 // Better slippage on MT5
    };
  }

  private async simulatePositionClosing(platform_trade_id: string, volume?: number): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 25));
    
    if (Math.random() < 0.01) {
      throw new Error('Position close rejected - Position not found, insufficient volume, or market closed');
    }
    
    return {
      deal_id: `D${Date.now()}`, // MT5 creates deal IDs for closing
      close_price: 1.0875 + Math.random() * 0.008 - 0.004,
      slippage: Math.random() * 1.5
    };
  }

  private async simulatePositionModification(platform_trade_id: string, stop_loss?: number, take_profit?: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 3 + Math.random() * 15));
    
    if (Math.random() < 0.005) {
      throw new Error('Position modification rejected - Invalid levels, position not found, or market closed');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.isConnected()) {
        await this.ping();
      }
    }, 25000); // Slightly more frequent than MT4
  }

  private simulateAdvancedTradeMonitoring(): void {
    if (!this.monitoring || !this.monitoringCallback) return;
    
    setTimeout(() => {
      if (this.monitoring && this.monitoringCallback) {
        const events = [
          'position_opened', 'position_closed', 'position_modified', 
          'deal_executed', 'order_placed', 'order_cancelled'
        ];
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD'];
        
        if (Math.random() < 0.35) { // Slightly higher event frequency for MT5
          const event = {
            type: events[Math.floor(Math.random() * events.length)],
            symbol: symbols[Math.floor(Math.random() * symbols.length)],
            platform_trade_id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            data: {
              trade_type: Math.random() > 0.5 ? 'buy' : 'sell',
              volume: Number((0.01 + Math.random() * 1.99).toFixed(2)), // MT5 uses volume instead of lot_size
              price: 1.0850 + Math.random() * 0.01 - 0.005,
              execution_mode: 'market', // MT5 has different execution modes
              gateway_latency: Math.random() * 5 // Additional MT5-specific data
            }
          };
          
          this.monitoringCallback(event);
        }
        
        this.simulateAdvancedTradeMonitoring();
      }
    }, 800 + Math.random() * 3200); // Slightly faster monitoring
  }
}