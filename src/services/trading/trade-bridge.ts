import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { IncomingMessage } from 'http';
import Redis from 'ioredis';
import { createClient } from '@/lib/supabase/server';
import type { TradingAccount, Trade, CopyMapping } from '@/types';

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
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    comment?: string;
  };
  mappingId: string;
  masterTradeId: string;
}

export class TradeBridgeService {
  private wss: WebSocketServer;
  private connections = new Map<string, EAConnection>();
  private redis: Redis;
  private supabase: any;
  private heartbeatInterval?: NodeJS.Timeout;
  
  constructor(port: number = 8080) {
    // Initialize Redis for message queuing and caching
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize Supabase client
    this.supabase = createClient();
    
    // Create HTTP server and WebSocket server
    const server = createServer((req, res) => {
      // Health check endpoint for Railway
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          connections: this.connections.size
        }));
        return;
      }
      
      // Default response for other HTTP requests
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('TradeCopy Pro - Trade Bridge Service');
    });
    
    this.wss = new WebSocketServer({ server });
    
    // Start server
    server.listen(port, () => {
      console.log(`🚀 Trade Bridge Service running on port ${port}`);
      console.log(`📡 WebSocket endpoint: ws://localhost:${port}`);
    });
    
    this.setupWebSocketHandlers();
    this.startHeartbeatMonitoring();
    this.setupRedisSubscriptions();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const connectionId = this.generateConnectionId();
      console.log(`🔗 New connection: ${connectionId} from ${req.socket.remoteAddress}`);
      
      // Initialize connection object
      const connection: Partial<EAConnection> = {
        id: connectionId,
        ws,
        lastHeartbeat: new Date(),
        isAuthenticated: false,
        connectionTime: new Date(),
        latency: 0
      };
      
      // Handle incoming messages
      ws.on('message', async (data: WebSocket.RawData) => {
        try {
          const signal: TradeSignal = JSON.parse(data.toString());
          await this.handleTradeSignal(connectionId, signal);
        } catch (error) {
          console.error(`❌ Error processing message from ${connectionId}:`, error);
          this.sendError(ws, 'Invalid message format');
        }
      });
      
      // Handle connection close
      ws.on('close', () => {
        console.log(`🔌 Connection closed: ${connectionId}`);
        this.connections.delete(connectionId);
        this.updateConnectionStatus(connectionId, 'disconnected');
      });
      
      // Handle connection errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });
      
      // Store partial connection (will be completed after authentication)
      this.connections.set(connectionId, connection as EAConnection);
      
      // Send authentication request
      this.sendMessage(ws, {
        type: 'auth_required',
        message: 'Please authenticate with account credentials'
      });
    });
  }

  private async handleTradeSignal(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Update latency calculation
    if (signal.latency) {
      connection.latency = signal.latency;
    }

    switch (signal.type) {
      case 'auth':
        await this.handleAuthentication(connectionId, signal);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(connectionId, signal);
        break;
        
      case 'trade_opened':
        if (connection.isAuthenticated) {
          await this.handleTradeOpened(connectionId, signal);
        }
        break;
        
      case 'trade_closed':
        if (connection.isAuthenticated) {
          await this.handleTradeClosed(connectionId, signal);
        }
        break;
        
      case 'trade_modified':
        if (connection.isAuthenticated) {
          await this.handleTradeModified(connectionId, signal);
        }
        break;
        
      default:
        this.sendError(connection.ws, `Unknown signal type: ${signal.type}`);
    }
  }

  private async handleAuthentication(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection || !signal.apiKey || !signal.accountNumber) {
      this.sendError(connection?.ws, 'Missing authentication credentials');
      return;
    }

    try {
      // Verify API key and get account details
      const { data: account } = await this.supabase
        .from('trading_accounts')
        .select(`
          id, user_id, account_number, account_type, platform_id,
          platform:trading_platforms(name, code)
        `)
        .eq('account_number', signal.accountNumber)
        .single();

      if (!account) {
        this.sendError(connection.ws, 'Account not found');
        return;
      }

      // Verify API key (stored in encrypted_credentials)
      const isValidKey = await this.verifyApiKey(account.id, signal.apiKey);
      if (!isValidKey) {
        this.sendError(connection.ws, 'Invalid API key');
        return;
      }

      // Update connection with account details
      Object.assign(connection, {
        accountId: account.id,
        accountNumber: account.account_number,
        accountType: account.account_type,
        userId: account.user_id,
        platform: account.platform.code,
        isAuthenticated: true
      });

      this.connections.set(connectionId, connection);

      // Send authentication success
      this.sendMessage(connection.ws, {
        type: 'auth_success',
        accountId: account.id,
        accountType: account.account_type,
        message: 'Authentication successful'
      });

      // Update connection status in database
      await this.updateConnectionStatus(account.id, 'connected');

      console.log(`✅ Authenticated: ${account.account_number} (${account.account_type})`);
      
    } catch (error) {
      console.error('❌ Authentication error:', error);
      this.sendError(connection.ws, 'Authentication failed');
    }
  }

  private handleHeartbeat(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastHeartbeat = new Date();
    
    // Respond with heartbeat acknowledgment
    this.sendMessage(connection.ws, {
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    });
  }

  private async handleTradeOpened(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection || !signal.trade) return;

    try {
      // Store trade in database
      const { data: trade } = await this.supabase
        .from('trades')
        .insert({
          account_id: connection.accountId,
          platform_trade_id: signal.trade.platformTradeId,
          symbol: signal.trade.symbol,
          trade_type: signal.trade.tradeType,
          lot_size: signal.trade.lotSize,
          open_price: signal.trade.openPrice,
          stop_loss: signal.trade.stopLoss,
          take_profit: signal.trade.takeProfit,
          status: 'open',
          opened_at: signal.trade.openTime
        })
        .select()
        .single();

      if (!trade) {
        console.error('❌ Failed to store trade in database');
        return;
      }

      console.log(`📈 Trade opened: ${signal.trade.symbol} ${signal.trade.tradeType} ${signal.trade.lotSize}`);

      // If this is a master account, trigger copy operations
      if (connection.accountType === 'master') {
        await this.processCopyMappings(trade);
      }

      // Send acknowledgment
      this.sendMessage(connection.ws, {
        type: 'trade_ack',
        tradeId: trade.id,
        platformTradeId: signal.trade.platformTradeId,
        status: 'recorded'
      });

      // Publish to Redis for real-time updates
      await this.redis.publish('trade_updates', JSON.stringify({
        type: 'trade_opened',
        accountId: connection.accountId,
        trade: trade
      }));

    } catch (error) {
      console.error('❌ Error handling trade opened:', error);
      this.sendError(connection.ws, 'Failed to process trade');
    }
  }

  private async processCopyMappings(masterTrade: Trade) {
    try {
      // Get all active copy mappings for this master account
      const { data: mappings } = await this.supabase
        .from('copy_mappings')
        .select(`
          id, slave_account_id, lot_scaling_type, lot_scaling_value,
          copy_symbols, ignore_symbols, max_lot_size, min_lot_size, copy_sl_tp,
          slave_account:trading_accounts!slave_account_id(id, account_number, account_type)
        `)
        .eq('master_account_id', masterTrade.account_id)
        .eq('is_active', true);

      if (!mappings || mappings.length === 0) return;

      // Process each copy mapping
      for (const mapping of mappings) {
        // Check symbol filtering
        if (mapping.copy_symbols && mapping.copy_symbols.length > 0) {
          if (!mapping.copy_symbols.includes(masterTrade.symbol)) continue;
        }
        
        if (mapping.ignore_symbols && mapping.ignore_symbols.includes(masterTrade.symbol)) {
          continue;
        }

        // Calculate lot size based on scaling rules
        const scaledLotSize = this.calculateScaledLotSize(
          masterTrade.lot_size,
          mapping.lot_scaling_type,
          mapping.lot_scaling_value,
          mapping.max_lot_size,
          mapping.min_lot_size
        );

        // Create copy instruction
        const copyInstruction: CopyInstruction = {
          type: 'execute_trade',
          targetAccountId: mapping.slave_account_id,
          trade: {
            symbol: masterTrade.symbol,
            tradeType: masterTrade.trade_type,
            lotSize: scaledLotSize,
            stopLoss: mapping.copy_sl_tp ? masterTrade.stop_loss : undefined,
            takeProfit: mapping.copy_sl_tp ? masterTrade.take_profit : undefined,
            comment: `Copy from ${masterTrade.platform_trade_id}`
          },
          mappingId: mapping.id,
          masterTradeId: masterTrade.id
        };

        // Send copy instruction to slave account
        await this.sendCopyInstruction(copyInstruction);

        // Create copied_trades record
        await this.supabase
          .from('copied_trades')
          .insert({
            mapping_id: mapping.id,
            master_trade_id: masterTrade.id,
            copy_status: 'pending'
          });
      }

    } catch (error) {
      console.error('❌ Error processing copy mappings:', error);
    }
  }

  private calculateScaledLotSize(
    originalLotSize: number,
    scalingType: string,
    scalingValue: number,
    maxLotSize?: number,
    minLotSize?: number
  ): number {
    let scaledSize: number;

    switch (scalingType) {
      case 'fixed':
        scaledSize = scalingValue;
        break;
      case 'percentage':
        scaledSize = originalLotSize * (scalingValue / 100);
        break;
      case 'balance_ratio':
        // This would require account balance information
        // For now, use percentage scaling
        scaledSize = originalLotSize * scalingValue;
        break;
      default:
        scaledSize = originalLotSize;
    }

    // Apply min/max limits
    if (minLotSize && scaledSize < minLotSize) scaledSize = minLotSize;
    if (maxLotSize && scaledSize > maxLotSize) scaledSize = maxLotSize;

    // Round to 2 decimal places
    return Math.round(scaledSize * 100) / 100;
  }

  private async sendCopyInstruction(instruction: CopyInstruction) {
    // Find connection for target account
    const targetConnection = Array.from(this.connections.values())
      .find(conn => conn.accountId === instruction.targetAccountId && conn.accountType === 'slave');

    if (targetConnection) {
      // Send directly via WebSocket
      this.sendMessage(targetConnection.ws, {
        type: 'copy_instruction',
        instruction
      });
    } else {
      // Queue instruction in Redis for when account comes online
      await this.redis.lpush(
        `copy_queue:${instruction.targetAccountId}`,
        JSON.stringify(instruction)
      );
      
      console.log(`📬 Queued copy instruction for offline account: ${instruction.targetAccountId}`);
    }
  }

  private async handleTradeClosed(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection || !signal.trade) return;

    try {
      // Update trade in database
      const { data: trade } = await this.supabase
        .from('trades')
        .update({
          close_price: signal.trade.closePrice,
          profit_loss: this.calculateProfitLoss(signal.trade),
          status: 'closed',
          closed_at: signal.trade.closeTime || new Date().toISOString()
        })
        .eq('account_id', connection.accountId)
        .eq('platform_trade_id', signal.trade.platformTradeId)
        .select()
        .single();

      if (trade) {
        console.log(`📉 Trade closed: ${signal.trade.symbol} P&L: ${trade.profit_loss}`);
        
        // Send acknowledgment
        this.sendMessage(connection.ws, {
          type: 'trade_ack',
          tradeId: trade.id,
          platformTradeId: signal.trade.platformTradeId,
          status: 'closed'
        });

        // Publish to Redis
        await this.redis.publish('trade_updates', JSON.stringify({
          type: 'trade_closed',
          accountId: connection.accountId,
          trade: trade
        }));
      }

    } catch (error) {
      console.error('❌ Error handling trade closed:', error);
      this.sendError(connection.ws, 'Failed to process trade closure');
    }
  }

  private async handleTradeModified(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection || !signal.trade) return;

    try {
      // Update trade in database
      await this.supabase
        .from('trades')
        .update({
          stop_loss: signal.trade.stopLoss,
          take_profit: signal.trade.takeProfit
        })
        .eq('account_id', connection.accountId)
        .eq('platform_trade_id', signal.trade.platformTradeId);

      console.log(`📝 Trade modified: ${signal.trade.symbol}`);
      
      // Send acknowledgment
      this.sendMessage(connection.ws, {
        type: 'trade_ack',
        platformTradeId: signal.trade.platformTradeId,
        status: 'modified'
      });

    } catch (error) {
      console.error('❌ Error handling trade modification:', error);
      this.sendError(connection.ws, 'Failed to process trade modification');
    }
  }

  private calculateProfitLoss(trade: any): number {
    if (!trade.closePrice || !trade.openPrice) return 0;
    
    const priceDiff = trade.tradeType === 'buy' 
      ? trade.closePrice - trade.openPrice
      : trade.openPrice - trade.closePrice;
    
    // Simplified P&L calculation (would need symbol specifications for accuracy)
    return Math.round(priceDiff * trade.lotSize * 100000 * 100) / 100;
  }

  private startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30 seconds timeout

      for (const [connectionId, connection] of this.connections.entries()) {
        const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > timeout) {
          console.log(`💔 Connection timeout: ${connectionId} (${connection.accountNumber})`);
          connection.ws.terminate();
          this.connections.delete(connectionId);
          this.updateConnectionStatus(connection.accountId, 'disconnected');
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private setupRedisSubscriptions() {
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Subscribe to trade updates for real-time dashboard
    subscriber.subscribe('trade_updates');
    subscriber.on('message', (channel: string, message: string) => {
      // Broadcast to WebSocket clients (dashboard)
      // This would be handled by your Next.js app
      console.log(`📡 Broadcasting: ${channel} - ${message}`);
    });
  }

  private async verifyApiKey(accountId: string, apiKey: string): Promise<boolean> {
    try {
      // This would decrypt and verify the API key
      // For now, return true for demonstration
      return true;
    } catch {
      return false;
    }
  }

  private async updateConnectionStatus(accountId: string, status: 'connected' | 'disconnected') {
    if (!accountId) return;
    
    try {
      await this.supabase
        .from('trading_accounts')
        .update({
          last_sync_at: new Date().toISOString(),
          // You might want to add a status field to the trading_accounts table
        })
        .eq('id', accountId);
    } catch (error) {
      console.error('❌ Error updating connection status:', error);
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket | undefined, message: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for external control
  public getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      masterAccounts: 0,
      slaveAccounts: 0,
      authenticatedConnections: 0,
      averageLatency: 0
    };

    let totalLatency = 0;
    let latencyCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.isAuthenticated) {
        stats.authenticatedConnections++;
        if (connection.accountType === 'master') stats.masterAccounts++;
        if (connection.accountType === 'slave') stats.slaveAccounts++;
        
        if (connection.latency > 0) {
          totalLatency += connection.latency;
          latencyCount++;
        }
      }
    }

    if (latencyCount > 0) {
      stats.averageLatency = Math.round(totalLatency / latencyCount);
    }

    return stats;
  }

  public async shutdown() {
    console.log('🛑 Shutting down Trade Bridge Service...');
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all WebSocket connections
    for (const connection of this.connections.values()) {
      connection.ws.close();
    }
    
    // Close WebSocket server
    this.wss.close();
    
    // Close Redis connection
    await this.redis.disconnect();
    
    console.log('✅ Trade Bridge Service stopped');
  }
}

// Export singleton instance and start service
const port = parseInt(process.env.PORT || '8080', 10);
export const tradeBridge = new TradeBridgeService(port);

// Handle graceful shutdown
process.on('SIGTERM', () => tradeBridge.shutdown());
process.on('SIGINT', () => tradeBridge.shutdown());