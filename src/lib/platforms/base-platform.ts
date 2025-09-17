export interface TradeOrder {
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  open_price?: number;
  stop_loss?: number;
  take_profit?: number;
  comment?: string;
  magic_number?: number;
}

export interface TradeResult {
  success: boolean;
  platform_trade_id?: string;
  actual_price?: number;
  execution_time_ms?: number;
  error_message?: string;
  slippage_points?: number;
}

export interface AccountInfo {
  account_number: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  currency: string;
  leverage: number;
  server: string;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

export interface Position {
  platform_trade_id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  open_price: number;
  current_price: number;
  stop_loss?: number;
  take_profit?: number;
  profit_loss: number;
  swap: number;
  commission: number;
  opened_at: Date;
  comment?: string;
}

export abstract class TradingPlatformService {
  protected accountId: string;
  protected platformConfig: any;
  protected connectionPool: Map<string, any> = new Map();
  
  constructor(accountId: string, platformConfig: any) {
    this.accountId = accountId;
    this.platformConfig = platformConfig;
  }

  // Connection management
  abstract connect(credentials: any): Promise<boolean>;
  abstract disconnect(): Promise<boolean>;
  abstract isConnected(): boolean;
  abstract ping(): Promise<number>; // Returns latency in ms

  // Trading operations
  abstract openTrade(order: TradeOrder): Promise<TradeResult>;
  abstract closeTrade(platform_trade_id: string, lot_size?: number): Promise<TradeResult>;
  abstract modifyTrade(platform_trade_id: string, stop_loss?: number, take_profit?: number): Promise<TradeResult>;

  // Account information
  abstract getAccountInfo(): Promise<AccountInfo>;
  abstract getPositions(): Promise<Position[]>;
  abstract getMarketData(symbols: string[]): Promise<MarketData[]>;

  // Real-time monitoring
  abstract startMonitoring(callback: (event: any) => void): Promise<boolean>;
  abstract stopMonitoring(): Promise<boolean>;
}