# MT4/5 Integration Guide

## Overview
Connecting to MT4/5 accounts requires implementing trading platform APIs and handling real-time data synchronization. This is a complex integration that involves several components.

## Integration Approaches

### 1. MetaTrader API Integration
- **MetaTrader 4**: Use MT4 Manager API or client terminal plugins
- **MetaTrader 5**: Use MT5 Gateway API or MetaApi service
- **WebTerminal**: Browser-based trading interface

### 2. Third-Party Services (Recommended for MVP)
- **MetaApi.cloud**: Cloud-based MT4/5 API service
- **FxPro API**: Professional trading API
- **FXCM Trading API**: REST and streaming APIs

### 3. Direct Broker Integration
- Each broker has their own API endpoints
- Popular brokers: FXCM, OANDA, Interactive Brokers, etc.

## Implementation Steps

### Phase 1: Basic Connection
1. **Account Credentials Storage**
   ```sql
   -- Already implemented in trading_accounts table
   encrypted_credentials JSONB -- stores API keys, passwords, etc.
   ```

2. **Platform Configuration**
   ```typescript
   // Add to trading_platforms table
   {
     api_endpoint: string;
     api_type: 'rest' | 'websocket' | 'plugin';
     connection_params: object;
   }
   ```

### Phase 2: Trade Synchronization
1. **Real-time Data Fetching**
   ```typescript
   // Example service structure
   class MT4Service {
     async fetchTrades(account: TradingAccount): Promise<Trade[]>
     async fetchBalance(account: TradingAccount): Promise<AccountBalance>
     async executeTrade(account: TradingAccount, trade: TradeOrder): Promise<Trade>
   }
   ```

2. **Background Jobs**
   ```typescript
   // Sync trades every 30 seconds
   setInterval(async () => {
     const accounts = await getActiveMT4Accounts();
     for (const account of accounts) {
       await syncAccountTrades(account);
     }
   }, 30000);
   ```

### Phase 3: Copy Trading Engine
1. **Trade Monitoring**
   - Monitor master accounts for new trades
   - Validate copy mapping rules
   - Execute trades on slave accounts

2. **Risk Management**
   - Check protection rules before copying
   - Validate lot sizes and account limits
   - Handle partial fills and errors

## Quick Demo Implementation

For demonstration purposes, you can create mock data:

### 1. Add Sample Trades API
```typescript
// src/app/api/trades/demo/route.ts
export async function POST() {
  // Insert demo trades for testing
  const demoTrades = [
    {
      symbol: 'EURUSD',
      trade_type: 'buy',
      lot_size: 0.1,
      open_price: 1.0850,
      close_price: 1.0875,
      profit_loss: 25.00,
      status: 'closed'
    }
  ];
  // Insert into database
}
```

### 2. Mock Platform Services
```typescript
// src/services/platforms/mt4-demo.ts
export class MT4DemoService {
  async connect(credentials: any) {
    // Mock connection
    return { connected: true, accountNumber: '12345' };
  }
  
  async fetchTrades() {
    // Return mock trades
    return mockTrades;
  }
}
```

## Production Integration Example (MetaApi)

```typescript
// Install: npm install metaapi.cloud-sdk

import MetaApi from 'metaapi.cloud-sdk';

class MT4ProductionService {
  private metaApi: MetaApi;

  constructor() {
    this.metaApi = new MetaApi(process.env.METAAPI_TOKEN);
  }

  async connectAccount(accountId: string, password: string, server: string) {
    const account = await this.metaApi.metatraderAccountApi.getAccount(accountId);
    await account.deploy();
    await account.waitConnected();
    
    const connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();
    
    return connection;
  }

  async fetchTrades(connection: any) {
    const deals = await connection.getDealHistory();
    return deals.map(deal => ({
      symbol: deal.symbol,
      trade_type: deal.type === 'DEAL_TYPE_BUY' ? 'buy' : 'sell',
      lot_size: deal.volume,
      open_price: deal.price,
      profit_loss: deal.profit,
      opened_at: new Date(deal.time * 1000).toISOString()
    }));
  }
}
```

## Next Steps for Your Project

1. **Choose Integration Method**
   - For demo: Use mock data and simulation
   - For production: Consider MetaApi or direct broker APIs

2. **Implement Background Sync Service**
   - Create a service that runs every 30 seconds
   - Sync account balances and trade history
   - Update database with latest information

3. **Add Copy Trading Logic**
   - Monitor master accounts for new trades
   - Apply copy mapping rules (lot scaling, symbol filtering)
   - Execute trades on slave accounts

4. **Security Considerations**
   - Encrypt API credentials properly
   - Use secure connections (HTTPS/WSS)
   - Implement rate limiting
   - Add audit logging

Would you like me to implement any of these components, starting with mock data for testing?