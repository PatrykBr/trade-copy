# 🚀 Simple Deployment Guide - Vercel + Railway

This guide shows you how to deploy TradeCopy Pro using **Vercel** (for the website) and **Railway** (for the trade bridge service) - both with generous free tiers perfect for testing.

## 📋 Prerequisites

- ✅ Supabase database (already set up)
- ✅ Stripe account (already configured)
- 🆕 Vercel account (free)
- 🆕 Railway account (free)

## 🌐 Part 1: Deploy Website to Vercel

### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "New Project" → Import from GitHub
3. Select your `trade-copy` repository
4. Vercel will auto-detect it's a Next.js project

### Step 2: Configure Environment Variables

In Vercel project settings, add these environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ifmqpzgqrmhhzrvfrurp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXFwemdxcm1oaHpydmZydXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTc0NjAsImV4cCI6MjA3MzM3MzQ2MH0.8qovD0hRxFf0YkLJuFfkj_NJxDlJcAuhBW5JROr1cKM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXFwemdxcm1oaHpydmZydXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc5NzQ2MCwiZXhwIjoyMDczMzczNDYwfQ.HRwpPjZcfuGre14KQPfn2UelMuXS7Z0hPZ4cCF4dzcg

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51S72C0DsLgZA2F6XcWkxm3CcnwSHCyNlD5N22qHOqpg0K53qZ1bRJ42X6BeUoZmpn3nRZqNbYwQPZVWnaRgxKOjW00YfJOVXya
STRIPE_SECRET_KEY=sk_test_51S72C0DsLgZA2F6XM1VrP60fnUqum3wXEwyT42fnLAiVFkC9aKcStqURC7Yv2y7yJENsG6BPa9xotu0c4i0ecUyK00rgGh2kcN
STRIPE_WEBHOOK_SECRET=whsec_a92ac46ba165d645a8720ee518d4a2415d1afa9534f704ecbff02c09cdfdc532

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_1S72OGDsLgZA2F6X0gjbZHQO
STRIPE_PRO_PRICE_ID=price_1S72ObDsLgZA2F6XKmTF2VlP
STRIPE_ENTERPRISE_PRICE_ID=price_1S72OtDsLgZA2F6XmKtUnBQo

# Trade Bridge (will be Railway URL)
TRADE_BRIDGE_URL=https://your-app.railway.app
```

### Step 3: Deploy

Click "Deploy" - Vercel will build and deploy your website automatically!

## 🚂 Part 2: Deploy Trade Bridge to Railway

### Step 1: Prepare Trade Bridge for Railway

Create a simple Railway configuration:

**railway.toml** (create this file):
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.railway"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**Dockerfile.railway** (create this file):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/services/trading/trade-bridge.ts ./
COPY src/lib/supabase/ ./lib/supabase/
COPY src/types/ ./types/

# Install TypeScript and compile
RUN npm install -g typescript ts-node
RUN npm install @types/node @types/ws

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the service
CMD ["ts-node", "trade-bridge.ts"]
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect the Dockerfile and deploy automatically

### Step 3: Add Environment Variables in Railway

In Railway dashboard, add these variables:

```bash
# Supabase
SUPABASE_URL=https://ifmqpzgqrmhhzrvfrurp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXFwemdxcm1oaHpydmZydXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc5NzQ2MCwiZXhwIjoyMDczMzczNDYwfQ.HRwpPjZcfuGre14KQPfn2UelMuXS7Z0hPZ4cCF4dzcg

# Redis (Railway will provide this)
REDIS_URL=${REDIS_URL}

# Server config
PORT=8080
NODE_ENV=production
```

### Step 4: Add Redis Database

In Railway dashboard:
1. Click "New" → "Database" → "Redis"
2. Railway will automatically provide `REDIS_URL` environment variable

## 🔧 Part 3: Update Your Code

### Update trade-bridge.ts for Railway

The trade bridge needs small modifications for Railway deployment:

```typescript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    connections: wsServer.clients.size 
  });
});

// Use Railway's PORT environment variable
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Trade Bridge running on port ${PORT}`);
});
```

### Update Vercel Website Config

Add the Railway URL to your environment variables and update any trade bridge calls to use `process.env.TRADE_BRIDGE_URL`.

## 🧪 Testing Your Deployment

### 1. Test Website
- Visit your Vercel URL (e.g., `https://trade-copy-xyz.vercel.app`)
- Sign up for an account
- Test authentication and basic functionality

### 2. Test Trade Bridge
- Visit Railway URL + `/health` (e.g., `https://your-app.railway.app/health`)
- Should return: `{"status":"healthy","timestamp":"...","connections":0}`

### 3. Test Expert Advisors
- Compile and attach EAs to MT4/MT5
- Check connection status in your dashboard
- Create test trades to verify copying

## 💰 Free Tier Limits

### **Vercel (Free)**
- Unlimited personal projects
- 100GB bandwidth/month
- Serverless functions
- Custom domains

### **Railway (Free)**
- $5 credit monthly
- Perfect for small apps
- Automatic scaling
- Easy database setup

### **Supabase (Free)**
- 500MB database
- 50,000 monthly active users
- Real-time subscriptions
- 2GB bandwidth

## 🔄 Continuous Deployment

Both platforms support automatic deployment:
- **Vercel**: Auto-deploys on Git push to main branch
- **Railway**: Auto-deploys on Git push
- Any code changes trigger automatic redeployment

## 🆘 Troubleshooting

### Common Issues:

1. **Build fails on Vercel**
   - Check environment variables are set
   - Verify Supabase connection

2. **Trade bridge won't start on Railway**
   - Check logs in Railway dashboard
   - Verify Redis connection
   - Ensure PORT is configured correctly

3. **EAs can't connect**
   - Check Railway URL is correct
   - Verify WebSocket endpoint is accessible
   - Test with curl or WebSocket testing tool

## 🎉 You're Done!

Your TradeCopy Pro platform is now running on:
- **Website**: Vercel (free hosting)
- **Trade Bridge**: Railway (free hosting)
- **Database**: Supabase (free tier)

This setup gives you a production-ready platform for testing without any hosting costs!