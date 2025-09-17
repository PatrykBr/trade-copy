"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeBridge = exports.TradeBridgeService = void 0;
const ws_1 = __importStar(require("ws"));
const http_1 = require("http");
const ioredis_1 = __importDefault(require("ioredis"));
const service_1 = require("../../lib/supabase/service");
class TradeBridgeService {
    constructor(port = 8080) {
        this.connections = new Map();
        // Initialize Redis for message queuing and caching
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        // Initialize Supabase client
        this.supabase = (0, service_1.createClient)();
        // Create HTTP server and WebSocket server
        const server = (0, http_1.createServer)((req, res) => {
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
        this.wss = new ws_1.WebSocketServer({ server });
        // Start server
        server.listen(port, () => {
            console.log(`🚀 Trade Bridge Service running on port ${port}`);
            console.log(`📡 WebSocket endpoint: ws://localhost:${port}`);
        });
        this.setupWebSocketHandlers();
        this.startHeartbeatMonitoring();
        this.setupRedisSubscriptions();
    }
    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, req) => {
            const connectionId = this.generateConnectionId();
            console.log(`🔗 New connection: ${connectionId} from ${req.socket.remoteAddress}`);
            // Initialize connection object
            const connection = {
                id: connectionId,
                ws,
                lastHeartbeat: new Date(),
                isAuthenticated: false,
                connectionTime: new Date(),
                latency: 0
            };
            // Handle incoming messages
            ws.on('message', async (data) => {
                try {
                    const signal = JSON.parse(data.toString());
                    await this.handleTradeSignal(connectionId, signal);
                }
                catch (error) {
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
            this.connections.set(connectionId, connection);
            // Send authentication request
            this.sendMessage(ws, {
                type: 'auth_required',
                message: 'Please authenticate with account credentials'
            });
        });
    }
    async handleTradeSignal(connectionId, signal) {
        const connection = this.connections.get(connectionId);
        if (!connection)
            return;
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
    async handleAuthentication(connectionId, signal) {
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
        }
        catch (error) {
            console.error('❌ Authentication error:', error);
            this.sendError(connection.ws, 'Authentication failed');
        }
    }
    handleHeartbeat(connectionId, signal) {
        const connection = this.connections.get(connectionId);
        if (!connection)
            return;
        connection.lastHeartbeat = new Date();
        // Respond with heartbeat acknowledgment
        this.sendMessage(connection.ws, {
            type: 'heartbeat_ack',
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
        });
    }
    async handleTradeOpened(connectionId, signal) {
        const connection = this.connections.get(connectionId);
        if (!connection || !signal.trade)
            return;
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
        }
        catch (error) {
            console.error('❌ Error handling trade opened:', error);
            this.sendError(connection.ws, 'Failed to process trade');
        }
    }
    async processCopyMappings(masterTrade) {
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
            if (!mappings || mappings.length === 0)
                return;
            // Process each copy mapping
            for (const mapping of mappings) {
                // Check symbol filtering
                if (mapping.copy_symbols && mapping.copy_symbols.length > 0) {
                    if (!mapping.copy_symbols.includes(masterTrade.symbol))
                        continue;
                }
                if (mapping.ignore_symbols && mapping.ignore_symbols.includes(masterTrade.symbol)) {
                    continue;
                }
                // Calculate lot size based on scaling rules
                const scaledLotSize = this.calculateScaledLotSize(masterTrade.lot_size, mapping.lot_scaling_type, mapping.lot_scaling_value, mapping.max_lot_size, mapping.min_lot_size);
                // Create copy instruction
                const copyInstruction = {
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
        }
        catch (error) {
            console.error('❌ Error processing copy mappings:', error);
        }
    }
    calculateScaledLotSize(originalLotSize, scalingType, scalingValue, maxLotSize, minLotSize) {
        let scaledSize;
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
        if (minLotSize && scaledSize < minLotSize)
            scaledSize = minLotSize;
        if (maxLotSize && scaledSize > maxLotSize)
            scaledSize = maxLotSize;
        // Round to 2 decimal places
        return Math.round(scaledSize * 100) / 100;
    }
    async sendCopyInstruction(instruction) {
        // Find connection for target account
        const targetConnection = Array.from(this.connections.values())
            .find(conn => conn.accountId === instruction.targetAccountId && conn.accountType === 'slave');
        if (targetConnection) {
            // Send directly via WebSocket
            this.sendMessage(targetConnection.ws, {
                type: 'copy_instruction',
                instruction
            });
        }
        else {
            // Queue instruction in Redis for when account comes online
            await this.redis.lpush(`copy_queue:${instruction.targetAccountId}`, JSON.stringify(instruction));
            console.log(`📬 Queued copy instruction for offline account: ${instruction.targetAccountId}`);
        }
    }
    async handleTradeClosed(connectionId, signal) {
        const connection = this.connections.get(connectionId);
        if (!connection || !signal.trade)
            return;
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
        }
        catch (error) {
            console.error('❌ Error handling trade closed:', error);
            this.sendError(connection.ws, 'Failed to process trade closure');
        }
    }
    async handleTradeModified(connectionId, signal) {
        const connection = this.connections.get(connectionId);
        if (!connection || !signal.trade)
            return;
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
        }
        catch (error) {
            console.error('❌ Error handling trade modification:', error);
            this.sendError(connection.ws, 'Failed to process trade modification');
        }
    }
    calculateProfitLoss(trade) {
        if (!trade.closePrice || !trade.openPrice)
            return 0;
        const priceDiff = trade.tradeType === 'buy'
            ? trade.closePrice - trade.openPrice
            : trade.openPrice - trade.closePrice;
        // Simplified P&L calculation (would need symbol specifications for accuracy)
        return Math.round(priceDiff * trade.lotSize * 100000 * 100) / 100;
    }
    startHeartbeatMonitoring() {
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
    setupRedisSubscriptions() {
        const subscriber = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        // Subscribe to trade updates for real-time dashboard
        subscriber.subscribe('trade_updates');
        subscriber.on('message', (channel, message) => {
            // Broadcast to WebSocket clients (dashboard)
            // This would be handled by your Next.js app
            console.log(`📡 Broadcasting: ${channel} - ${message}`);
        });
    }
    async verifyApiKey(accountId, apiKey) {
        try {
            // This would decrypt and verify the API key
            // For now, return true for demonstration
            return true;
        }
        catch {
            return false;
        }
    }
    async updateConnectionStatus(accountId, status) {
        if (!accountId)
            return;
        try {
            await this.supabase
                .from('trading_accounts')
                .update({
                last_sync_at: new Date().toISOString(),
                // You might want to add a status field to the trading_accounts table
            })
                .eq('id', accountId);
        }
        catch (error) {
            console.error('❌ Error updating connection status:', error);
        }
    }
    sendMessage(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    sendError(ws, message) {
        if (ws && ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify({
                type: 'error',
                message,
                timestamp: new Date().toISOString()
            }));
        }
    }
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Public methods for external control
    getConnectionStats() {
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
                if (connection.accountType === 'master')
                    stats.masterAccounts++;
                if (connection.accountType === 'slave')
                    stats.slaveAccounts++;
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
    async shutdown() {
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
exports.TradeBridgeService = TradeBridgeService;
// Export singleton instance and start service
const port = parseInt(process.env.PORT || '8080', 10);
exports.tradeBridge = new TradeBridgeService(port);
// Handle graceful shutdown
process.on('SIGTERM', () => exports.tradeBridge.shutdown());
process.on('SIGINT', () => exports.tradeBridge.shutdown());
