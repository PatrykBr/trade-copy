# 🚀 TradeCopy Pro - Simple Deployment Guide

This guide will help you deploy your TradeCopy Pro platform with **zero server management experience required**.

## 🎯 Deployment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway        │    │   Supabase      │
│   (Website)     │────│   (Trade Bridge) │────│   (Database)    │
│   Next.js App   │    │   WebSocket Server│   │   PostgreSQL    │
│   FREE          │    │   FREE TESTING   │    │   FREE TIER     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

1. **GitHub Account** (free)
2. **Vercel Account** (free) - https://vercel.com
3. **Railway Account** (free) - https://railway.app
4. **Supabase Account** (free) - https://supabase.com

## 🔧 Step 1: Prepare Your Code

### 1.1 Create GitHub Repository
```bash
# In your project folder
git init
git add .
git commit -m "Initial TradeCopy Pro setup"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/tradecopy-pro.git
git push -u origin main
```

### 1.2 Environment Variables
Create `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

## 🌐 Step 2: Deploy Website to Vercel (FREE)

### 2.1 Deploy on Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. **Framework Preset**: Next.js
5. **Build Command**: `npm run build --turbopack`
6. **Output Directory**: `.next`
7. Add all your environment variables from `.env.local`
8. Click "Deploy"

### 2.2 Configure Domain
- Vercel gives you: `your-app.vercel.app`
- You can add custom domain later

## 🚂 Step 3: Deploy Trade Bridge to Railway (FREE)

Railway gives you **$5/month credit** which is perfect for testing!

### 3.1 Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select "Deploy bridge service"

### 3.2 Configure Railway Environment
Add these environment variables in Railway:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
PORT=3001
```

### 3.3 Configure Railway Service
1. **Service Name**: `tradecopy-bridge`
2. **Start Command**: `npm run start:bridge`
3. **Port**: `3001`
4. **Health Check**: `/health`

### 3.4 Get Railway URL
Railway will give you: `tradecopy-bridge-production.up.railway.app`

## 🔗 Step 4: Connect Everything

### 4.1 Update Next.js Config
Add to your `next.config.ts`:
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BRIDGE_SERVICE_URL: process.env.BRIDGE_SERVICE_URL || 'wss://tradecopy-bridge-production.up.railway.app'
  }
}

module.exports = nextConfig
```

### 4.2 Update Vercel Environment
Add to Vercel environment variables:
```env
BRIDGE_SERVICE_URL=wss://your-railway-app.up.railway.app
```

## 🤖 Step 5: Test Your Setup

### 5.1 Test Bridge Service
Open browser: `https://your-railway-app.up.railway.app/health`
Should return:
```json
{
  "status": "healthy",
  "connections": 0,
  "timestamp": "2025-09-16T..."
}
```

### 5.2 Test Website
Open: `https://your-app.vercel.app`
- Check login/signup works
- Check dashboard loads
- Check trading account creation

### 5.3 Test MT4/MT5 Connection
1. Open MT4/MT5 terminal
2. Load the Expert Advisor
3. Set parameters:
   - **Bridge URL**: `wss://your-railway-app.up.railway.app`
   - **Account Number**: Your account number
   - **API Key**: Any test key for now
4. Check connection in bridge logs

## 🆓 Alternative Free Hosting Options

### Option 1: Render (Free)
- **Free tier**: 750 hours/month
- **Pros**: Never expires, easy setup
- **Cons**: Sleeps after 15min inactivity
- **Setup**: Connect GitHub → Auto deploy

### Option 2: Fly.io (Free)
- **Free tier**: 3 VMs, 160GB bandwidth
- **Pros**: No sleep, persistent storage
- **Cons**: More complex setup
- **Setup**: Uses Docker (included in project)

### Option 3: Heroku (Paid but cheap)
- **Cost**: $7/month for eco dyno
- **Pros**: Never sleeps, reliable
- **Setup**: Connect GitHub → Deploy

## 📊 Monitoring & Debugging

### Railway Logs
```bash
# View live logs
railway logs
```

### Bridge Service Health
```bash
# Check if bridge is running
curl https://your-railway-app.up.railway.app/health
```

### Supabase Logs
- Go to Supabase dashboard
- Click "Logs" to see database activity

## 🔧 Troubleshooting

### Bridge Service Won't Start
1. Check Railway logs for errors
2. Verify environment variables
3. Check Supabase credentials

### Website Deploy Fails
1. Check Vercel build logs
2. Verify Next.js configuration
3. Check environment variables

### MT4/MT5 Can't Connect
1. Check bridge service health endpoint
2. Verify WebSocket URL in EA settings
3. Check Supabase trading_accounts table

## 💰 Cost Breakdown (Testing)

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| **Vercel** | 100GB bandwidth, unlimited sites | $0 |
| **Railway** | $5 credit/month | $0 (covers testing) |
| **Supabase** | 500MB database, 50MB storage | $0 |
| **Total** | | **$0/month** |

## 🚀 Next Steps

1. **Deploy following this guide**
2. **Test with demo MT4/MT5 accounts**
3. **Add your Stripe keys for payments**
4. **Scale to paid tiers when ready**

## 📞 Need Help?

If you get stuck:
1. Check the service logs first
2. Verify all environment variables
3. Test each component separately
4. Check the health endpoints

**Your TradeCopy Pro platform will be live and free for testing!** 🎉

---

## 🔄 Quick Deploy Commands

```bash
# 1. Prepare code
git add . && git commit -m "Deploy ready" && git push

# 2. Test bridge locally
npm run start:bridge

# 3. Test bridge health
curl http://localhost:3001/health
```

All services should be running within **10 minutes** of following this guide!