import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { IncomingMessage } from 'http';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIS_URL = process.env.REDIS_URL;
const PORT = parseInt(process.env.PORT || '3001');

// Type definitions
interface TradingAccount {
  id: string;
  user_id: string;
  account_number: string;
  account_type: 'master' | 'slave';
  platform_id: string;
  is_active: boolean;
  encrypted_credentials?: string;
}

interface Trade {
  id: string;
  account_id: string;
  platform_trade_id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  open_price: number;
  close_price?: number;
  stop_loss?: number;
  take_profit?: number;
  status: 'open' | 'closed' | 'pending';
  opened_at: string;
  closed_at?: string;
}

interface CopyMapping {
  id: string;
  user_id: string;
  master_account_id: string;
  slave_account_id: string;
  lot_scaling_type: 'fixed' | 'percentage' | 'balance_ratio';
  lot_scaling_value: number;
  copy_symbols?: string[];
  ignore_symbols?: string[];
  max_lot_size?: number;
  min_lot_size?: number;
  copy_sl_tp: boolean;
  is_active: boolean;
}

interface EAConnection {
  id: string;
  ws: WebSocket;
  accountId: string;
  accountNumber: string;
  accountType: 'master' | 'slave';
  userId: string;
  platform: string;
  lastHeartbeat: Date;
  isAuthenticated: boolean;
  connectionTime: Date;
  latency: number;
}

interface TradeSignal {
  type: 'trade_opened' | 'trade_closed' | 'trade_modified' | 'heartbeat' | 'auth';
  accountNumber: string;
  accountId?: string;
  apiKey?: string;
  trade?: {
    platformTradeId: string;
    symbol: string;
    tradeType: 'buy' | 'sell';
    lotSize: number;
    openPrice: number;
    closePrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    comment?: string;
    magicNumber?: number;
    openTime: string;
    closeTime?: string;
  };
  timestamp: string;
  latency?: number;
}

interface CopyInstruction {
  type: 'execute_trade' | 'close_trade' | 'modify_trade';
  targetAccountId: string;
  trade: {
    symbol: string;
    tradeType: 'buy' | 'sell';
    lotSize: number;
    openPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    platformTradeId?: string;
  };
  copyMappingId: string;
  masterTradeId: string;
}

class TradeBridgeService {
  private wss: WebSocketServer;
  private server: any;
  private connections: Map<string, EAConnection> = new Map();
  private redis: Redis | null = null;
  private supabase: any;

  constructor() {
    console.log('🚀 Initializing TradeCopy Bridge Service...');
    
    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    }

    // Initialize Supabase client
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Initialize Redis if URL is provided
    if (REDIS_URL) {
      this.redis = new Redis(REDIS_URL);
      console.log('📡 Redis connected for message queuing');
    } else {
      console.log('⚠️  Redis not configured - using in-memory messaging');
    }

    // Create HTTP server
    this.server = createServer();
    
    // Add health check endpoint
    this.server.on('request', (req: IncomingMessage, res: any) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          connections: this.connections.size,
          timestamp: new Date().toISOString()
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Initialize WebSocket server
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const connectionId = this.generateConnectionId();
      const clientIP = req.socket.remoteAddress;
      
      console.log(`🔌 New connection: ${connectionId} from ${clientIP}`);

      // Set up temporary connection
      const tempConnection: Partial<EAConnection> = {
        id: connectionId,
        ws,
        lastHeartbeat: new Date(),
        isAuthenticated: false,
        connectionTime: new Date(),
        latency: 0
      };

      ws.on('message', async (data: Buffer) => {
        try {
          const signal: TradeSignal = JSON.parse(data.toString());
          await this.handleTradeSignal(connectionId, signal, tempConnection);
        } catch (error) {
          console.error(`❌ Error handling message from ${connectionId}:`, error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Connection closed: ${connectionId}`);
        this.connections.delete(connectionId);
        this.updateConnectionStatus(connectionId, false);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        connectionId,
        message: 'Connected to TradeCopy Bridge Service'
      }));
    });
  }

  private async handleTradeSignal(
    connectionId: string, 
    signal: TradeSignal, 
    tempConnection: Partial<EAConnection>
  ): Promise<void> {
    const connection = this.connections.get(connectionId) || tempConnection;

    switch (signal.type) {
      case 'auth':
        await this.authenticateConnection(connectionId, signal, tempConnection);
        break;

      case 'heartbeat':
        await this.handleHeartbeat(connectionId, signal);
        break;

      case 'trade_opened':
      case 'trade_closed':
      case 'trade_modified':
        if (!connection.isAuthenticated) {
          tempConnection.ws?.send(JSON.stringify({
            type: 'error',
            message: 'Authentication required'
          }));
          return;
        }
        await this.handleTradeEvent(connectionId, signal);
        break;

      default:
        console.log(`⚠️  Unknown signal type: ${signal.type}`);
    }
  }

  private async authenticateConnection(
    connectionId: string, 
    signal: TradeSignal, 
    tempConnection: Partial<EAConnection>
  ): Promise<void> {
    try {
      if (!signal.accountNumber || !signal.apiKey) {
        tempConnection.ws?.send(JSON.stringify({
          type: 'auth_failed',
          message: 'Account number and API key required'
        }));
        return;
      }

      // Verify account exists and API key matches
      const { data: account, error } = await this.supabase
        .from('trading_accounts')
        .select('*')
        .eq('account_number', signal.accountNumber)
        .single();

      if (error || !account) {
        tempConnection.ws?.send(JSON.stringify({
          type: 'auth_failed',
          message: 'Invalid account number'
        }));
        return;
      }

      // In production, verify encrypted API key
      // For now, we'll skip API key verification for testing
      
      // Create authenticated connection
      const authenticatedConnection: EAConnection = {
        id: connectionId,
        ws: tempConnection.ws!,
        accountId: account.id,
        accountNumber: signal.accountNumber,
        accountType: account.account_type,
        userId: account.user_id,
        platform: signal.accountId || 'MT4', // Default to MT4 if not specified
        lastHeartbeat: new Date(),
        isAuthenticated: true,
        connectionTime: tempConnection.connectionTime!,
        latency: signal.latency || 0
      };

      this.connections.set(connectionId, authenticatedConnection);

      // Update connection status in database
      await this.updateConnectionStatus(connectionId, true, authenticatedConnection);

      // Send success response
      tempConnection.ws?.send(JSON.stringify({
        type: 'auth_success',
        accountId: account.id,
        accountType: account.account_type,
        message: 'Authentication successful'
      }));

      console.log(`✅ Authenticated: ${signal.accountNumber} (${account.account_type})`);

    } catch (error) {
      console.error('❌ Authentication error:', error);
      tempConnection.ws?.send(JSON.stringify({
        type: 'auth_failed',
        message: 'Authentication failed'
      }));
    }
  }

  private async handleHeartbeat(connectionId: string, signal: TradeSignal): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastHeartbeat = new Date();
    if (signal.latency) {
      connection.latency = signal.latency;
    }

    // Update database heartbeat
    await this.supabase
      .from('ea_connections')
      .update({ 
        last_heartbeat: new Date().toISOString(),
        latency_ms: connection.latency 
      })
      .eq('connection_id', connectionId);

    // Send heartbeat response
    connection.ws.send(JSON.stringify({
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString()
    }));
  }

  private async handleTradeEvent(connectionId: string, signal: TradeSignal): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !signal.trade) return;

    try {
      // Save trade to database
      const tradeData = {
        account_id: connection.accountId,
        platform_trade_id: signal.trade.platformTradeId,
        symbol: signal.trade.symbol,
        trade_type: signal.trade.tradeType,
        lot_size: signal.trade.lotSize,
        open_price: signal.trade.openPrice,
        close_price: signal.trade.closePrice,
        stop_loss: signal.trade.stopLoss,
        take_profit: signal.trade.takeProfit,
        status: signal.type === 'trade_closed' ? 'closed' : 'open',
        opened_at: signal.trade.openTime,
        closed_at: signal.trade.closeTime
      };

      const { data: trade, error } = await this.supabase
        .from('trades')
        .upsert(tradeData, { 
          onConflict: 'account_id,platform_trade_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving trade:', error);
        return;
      }

      console.log(`📊 Trade ${signal.type}: ${signal.trade.symbol} ${signal.trade.tradeType} ${signal.trade.lotSize}`);

      // If this is a master account, process copy mappings
      if (connection.accountType === 'master') {
        await this.processCopyMappings(trade, signal.type);
      }

      // Send acknowledgment
      connection.ws.send(JSON.stringify({
        type: 'trade_ack',
        tradeId: trade.id,
        platformTradeId: signal.trade.platformTradeId
      }));

    } catch (error) {
      console.error('❌ Error handling trade event:', error);
    }
  }

  private async processCopyMappings(masterTrade: Trade, eventType: string): Promise<void> {
    try {
      // Get active copy mappings for this master account
      const { data: mappings, error } = await this.supabase
        .from('copy_mappings')
        .select(`
          *,
          slave_account:trading_accounts!slave_account_id(*)
        `)
        .eq('master_account_id', masterTrade.account_id)
        .eq('is_active', true);

      if (error || !mappings?.length) return;

      for (const mapping of mappings) {
        // Check symbol filters
        if (!this.shouldCopySymbol(masterTrade.symbol, mapping)) {
          continue;
        }

        // Calculate scaled lot size
        const scaledLotSize = this.calculateScaledLotSize(
          masterTrade.lot_size,
          mapping.lot_scaling_type,
          mapping.lot_scaling_value,
          mapping.min_lot_size,
          mapping.max_lot_size
        );

        // Create copy instruction
        const instruction: CopyInstruction = {
          type: eventType === 'trade_opened' ? 'execute_trade' : 'close_trade',
          targetAccountId: mapping.slave_account_id,
          trade: {
            symbol: masterTrade.symbol,
            tradeType: masterTrade.trade_type,
            lotSize: scaledLotSize,
            openPrice: masterTrade.open_price,
            stopLoss: mapping.copy_sl_tp ? masterTrade.stop_loss : undefined,
            takeProfit: mapping.copy_sl_tp ? masterTrade.take_profit : undefined,
            platformTradeId: masterTrade.platform_trade_id
          },
          copyMappingId: mapping.id,
          masterTradeId: masterTrade.id
        };

        // Send instruction to slave account
        await this.sendCopyInstruction(instruction);
      }

    } catch (error) {
      console.error('❌ Error processing copy mappings:', error);
    }
  }

  private shouldCopySymbol(symbol: string, mapping: CopyMapping): boolean {
    // Check ignore list first
    if (mapping.ignore_symbols?.includes(symbol)) {
      return false;
    }

    // Check copy list (if specified, only copy these symbols)
    if (mapping.copy_symbols?.length && !mapping.copy_symbols.includes(symbol)) {
      return false;
    }

    return true;
  }

  private calculateScaledLotSize(
    originalLot: number,
    scalingType: string,
    scalingValue: number,
    minLot?: number,
    maxLot?: number
  ): number {
    let scaledLot: number;

    switch (scalingType) {
      case 'fixed':
        scaledLot = scalingValue;
        break;
      case 'percentage':
        scaledLot = originalLot * (scalingValue / 100);
        break;
      case 'balance_ratio':
        scaledLot = originalLot * scalingValue;
        break;
      default:
        scaledLot = originalLot;
    }

    // Apply min/max constraints
    if (minLot && scaledLot < minLot) scaledLot = minLot;
    if (maxLot && scaledLot > maxLot) scaledLot = maxLot;

    return Math.round(scaledLot * 100) / 100; // Round to 2 decimal places
  }

  private async sendCopyInstruction(instruction: CopyInstruction): Promise<void> {
    // Find slave account connection
    const slaveConnection = Array.from(this.connections.values())
      .find(conn => conn.accountId === instruction.targetAccountId);

    if (slaveConnection) {
      // Direct WebSocket delivery
      slaveConnection.ws.send(JSON.stringify({
        type: 'copy_instruction',
        instruction
      }));
      console.log(`📤 Copy instruction sent to ${slaveConnection.accountNumber}`);
    } else {
      // Store instruction for HTTP polling
      await this.supabase
        .from('copy_instructions')
        .insert({
          mapping_id: instruction.copyMappingId,
          master_trade_id: instruction.masterTradeId,
          instruction_data: instruction,
          status: 'pending',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        });
      
      console.log(`📥 Copy instruction queued for offline account`);
    }

    // Record copy attempt
    await this.supabase
      .from('copied_trades')
      .insert({
        mapping_id: instruction.copyMappingId,
        master_trade_id: instruction.masterTradeId,
        copy_status: 'pending'
      });
  }

  private async updateConnectionStatus(
    connectionId: string, 
    isActive: boolean, 
    connection?: EAConnection
  ): Promise<void> {
    try {
      if (isActive && connection) {
        // Insert or update connection
        await this.supabase
          .from('ea_connections')
          .upsert({
            connection_id: connectionId,
            account_id: connection.accountId,
            connection_type: 'websocket',
            ip_address: '0.0.0.0', // Would get from request in production
            platform: connection.platform,
            is_active: true,
            last_heartbeat: new Date().toISOString(),
            connection_time: connection.connectionTime.toISOString(),
            latency_ms: connection.latency
          });
      } else {
        // Mark as disconnected
        await this.supabase
          .from('ea_connections')
          .update({
            is_active: false,
            disconnect_time: new Date().toISOString()
          })
          .eq('connection_id', connectionId);
      }
    } catch (error) {
      console.error('❌ Error updating connection status:', error);
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupTask(): void {
    setInterval(async () => {
      try {
        // Clean up expired copy instructions
        await this.supabase
          .from('copy_instructions')
          .delete()
          .eq('status', 'pending')
          .lt('expires_at', new Date().toISOString());

        // Clean up stale connections
        const staleConnections = Array.from(this.connections.entries())
          .filter(([_, conn]) => {
            const timeSinceHeartbeat = Date.now() - conn.lastHeartbeat.getTime();
            return timeSinceHeartbeat > 60000; // 1 minute
          });

        for (const [connectionId, conn] of staleConnections) {
          console.log(`🧹 Cleaning up stale connection: ${connectionId}`);
          conn.ws.terminate();
          this.connections.delete(connectionId);
          await this.updateConnectionStatus(connectionId, false);
        }

      } catch (error) {
        console.error('❌ Cleanup task error:', error);
      }
    }, 30000); // Run every 30 seconds
  }

  public start(): void {
    this.server.listen(PORT, () => {
      console.log(`🚀 TradeCopy Bridge Service running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      this.startCleanupTask();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down gracefully...');
      this.wss.close(() => {
        this.server.close(() => {
          process.exit(0);
        });
      });
    });
  }
}

// Start the service
const bridgeService = new TradeBridgeService();
bridgeService.start();