import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import Redis from 'ioredis';

interface EAConnection {
  id: string;
  ws: WebSocket;
  accountId: string;
  accountNumber: string;
  accountType: 'master' | 'slave';
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

export class TradeBridgeService {
  private wss!: WebSocketServer;
  private connections = new Map<string, EAConnection>();
  private redis: Redis;
  private heartbeatInterval?: NodeJS.Timeout;
  private server: any;
  
  constructor() {
    // Initialize Redis for message queuing and caching
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    this.redis.on('connect', () => {
      console.log('✅ Connected to Redis');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });
  }

  async start(port: number = parseInt(process.env.PORT || '8080')): Promise<void> {
    // Create HTTP server and WebSocket server
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    
    // Add health check endpoint for Railway
    this.server.on('request', (req: any, res: any) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          connections: this.connections.size,
          uptime: process.uptime(),
          redis_connected: this.redis.status === 'ready'
        }));
        return;
      }
      
      // Handle other HTTP requests
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });
    
    // Start server
    this.server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Trade Bridge Service running on port ${port}`);
      console.log(`📡 WebSocket endpoint: ws://0.0.0.0:${port}`);
      console.log(`❤️  Health check: http://0.0.0.0:${port}/health`);
    });
    
    this.setupWebSocketHandlers();
    this.startHeartbeatMonitoring();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const connectionId = this.generateConnectionId();
      const clientIP = req.socket.remoteAddress;
      
      console.log(`🔗 New WebSocket connection: ${connectionId} from ${clientIP}`);

      // Create temporary connection entry
      const connection: EAConnection = {
        id: connectionId,
        ws,
        accountId: '',
        accountNumber: '',
        accountType: 'slave',
        platform: '',
        lastHeartbeat: new Date(),
        isAuthenticated: false,
        connectionTime: new Date(),
        latency: 0
      };

      this.connections.set(connectionId, connection);

      ws.on('message', async (data: Buffer) => {
        try {
          const signal: TradeSignal = JSON.parse(data.toString());
          await this.handleTradeSignal(connectionId, signal);
        } catch (error) {
          console.error(`❌ Error parsing message from ${connectionId}:`, error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Connection closed: ${connectionId}`);
        this.connections.delete(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });

      // Send connection acknowledgment
      ws.send(JSON.stringify({
        type: 'connection_ack',
        connectionId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  private async handleTradeSignal(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Update connection timestamp
    connection.lastHeartbeat = new Date();

    switch (signal.type) {
      case 'auth':
        await this.handleAuthentication(connectionId, signal);
        break;
        
      case 'heartbeat':
        await this.handleHeartbeat(connectionId, signal);
        break;
        
      case 'trade_opened':
      case 'trade_closed':
      case 'trade_modified':
        if (connection.isAuthenticated) {
          await this.handleTradeEvent(connectionId, signal);
        } else {
          connection.ws.send(JSON.stringify({
            type: 'error',
            message: 'Authentication required'
          }));
        }
        break;
        
      default:
        console.log(`⚠️  Unknown signal type: ${signal.type}`);
    }
  }

  private async handleAuthentication(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // For demo purposes, accept any authentication
    // In production, validate against Supabase database
    if (signal.accountNumber && signal.apiKey) {
      connection.accountNumber = signal.accountNumber;
      connection.accountId = signal.accountId || signal.accountNumber;
      connection.isAuthenticated = true;
      
      console.log(`✅ Account authenticated: ${signal.accountNumber}`);
      
      connection.ws.send(JSON.stringify({
        type: 'auth_success',
        message: 'Authentication successful',
        accountNumber: signal.accountNumber
      }));

      // Store connection info in Redis
      await this.redis.hset(
        `ea_connection:${connectionId}`,
        'accountNumber', signal.accountNumber,
        'accountId', connection.accountId,
        'connected_at', new Date().toISOString(),
        'status', 'connected'
      );
    } else {
      connection.ws.send(JSON.stringify({
        type: 'auth_failed',
        message: 'Invalid credentials'
      }));
    }
  }

  private async handleHeartbeat(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAuthenticated) return;

    // Calculate latency if provided
    if (signal.latency) {
      connection.latency = signal.latency;
    }

    // Update heartbeat in Redis
    await this.redis.hset(
      `ea_connection:${connectionId}`,
      'last_heartbeat', new Date().toISOString(),
      'latency', connection.latency.toString()
    );

    // Send heartbeat response
    connection.ws.send(JSON.stringify({
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString(),
      server_time: Date.now()
    }));
  }

  private async handleTradeEvent(connectionId: string, signal: TradeSignal) {
    const connection = this.connections.get(connectionId);
    if (!connection || !signal.trade) return;

    console.log(`📈 Trade event: ${signal.type} for account ${connection.accountNumber}`);

    // Store trade event in Redis
    const tradeKey = `trade_event:${Date.now()}:${connectionId}`;
    await this.redis.hset(tradeKey, {
      account_number: connection.accountNumber,
      account_id: connection.accountId,
      event_type: signal.type,
      trade_data: JSON.stringify(signal.trade),
      timestamp: new Date().toISOString()
    });

    // Set expiration for trade events (24 hours)
    await this.redis.expire(tradeKey, 86400);

    // Acknowledge trade event
    connection.ws.send(JSON.stringify({
      type: 'trade_ack',
      trade_id: signal.trade.platformTradeId,
      status: 'received'
    }));

    // In production: Process copy mappings and send copy instructions
    console.log(`✅ Trade event processed: ${signal.trade.symbol} ${signal.trade.tradeType} ${signal.trade.lotSize}`);
  }

  private startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleConnections: string[] = [];

      for (const [connectionId, connection] of this.connections.entries()) {
        const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
        
        // Consider connection stale after 60 seconds without heartbeat
        if (timeSinceHeartbeat > 60000) {
          staleConnections.push(connectionId);
        }
      }

      // Clean up stale connections
      for (const connectionId of staleConnections) {
        const connection = this.connections.get(connectionId);
        if (connection) {
          console.log(`🧹 Removing stale connection: ${connectionId}`);
          connection.ws.close();
          this.connections.delete(connectionId);
          
          // Remove from Redis
          this.redis.del(`ea_connection:${connectionId}`);
        }
      }

      console.log(`💓 Heartbeat check: ${this.connections.size} active connections`);
    }, 30000); // Check every 30 seconds
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      averageLatency: 0
    };

    let totalLatency = 0;
    let latencyCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.isAuthenticated) {
        stats.authenticatedConnections++;
        
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
    if (this.wss) {
      this.wss.close();
    }

    // Close HTTP server
    if (this.server) {
      this.server.close();
    }
    
    // Close Redis connection
    await this.redis.disconnect();
    
    console.log('✅ Trade Bridge Service stopped');
  }
}

// Create and start the service
const tradeBridge = new TradeBridgeService();

if (require.main === module) {
  tradeBridge.start()
    .then(() => {
      console.log('✅ Trade Bridge Service started successfully');
    })
    .catch((error) => {
      console.error('❌ Failed to start Trade Bridge Service:', error);
      process.exit(1);
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => tradeBridge.shutdown());
process.on('SIGINT', () => tradeBridge.shutdown());

export default tradeBridge;