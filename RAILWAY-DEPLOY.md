# 🚂 Quick Railway Deployment Guide

This guide shows you the **simplest way** to deploy your TradeCopy Pro trade bridge service to Railway (free hosting).

## 🎯 What You'll Deploy

- **Website**: Keep running locally for now (`npm run dev`)
- **Trade Bridge**: Deploy to Railway (handles MT4/MT5 connections)
- **Database**: Already running on Supabase ✅

## 📋 Before You Start

- ✅ Your Supabase database is ready
- 🆕 Create Railway account at [railway.app](https://railway.app)

## 🚀 Deploy to Railway (5 Minutes)

### Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)

### Step 2: Create New Project

1. Click "Deploy from GitHub repo"
2. Connect your GitHub account
3. Select your `trade-copy` repository
4. Choose "Deploy Now"

### Step 3: Add Environment Variables

In Railway dashboard, go to your project → Variables tab:

```bash
# Supabase Connection
SUPABASE_URL=https://ifmqpzgqrmhhzrvfrurp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXFwemdxcm1oaHpydmZydXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc5NzQ2MCwiZXhwIjoyMDczMzczNDYwfQ.HRwpPjZcfuGre14KQPfn2UelMuXS7Z0hPZ4cCF4dzcg

# Server Configuration
PORT=8080
NODE_ENV=production
```

### Step 4: Add Redis Database

1. In Railway dashboard, click "+ New"
2. Select "Database" → "Redis"
3. Railway automatically creates `REDIS_URL` variable

### Step 5: Deploy

1. Railway will automatically build and deploy
2. Wait for deployment to complete (~2-3 minutes)
3. You'll get a public URL like: `https://your-app.railway.app`

## ✅ Test Your Deployment

### Check Health Status

Visit your Railway URL + `/health`:
```
https://your-app.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "connections": 0,
  "uptime": 123.45,
  "redis_connected": true
}
```

### Test WebSocket Connection

Use a WebSocket testing tool or browser console:
```javascript
const ws = new WebSocket('wss://your-app.railway.app');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

## 🔧 Update Your Local Development

### Update EA Files

In your MT4/MT5 Expert Advisors, change the server URL:

**TradeCopy_Monitor.mq4/mq5:**
```cpp
// Replace localhost with your Railway URL
string serverUrl = "wss://your-app.railway.app";
```

**TradeCopy_Executor.mq4/mq5:**
```cpp
// Replace localhost with your Railway URL  
string serverUrl = "wss://your-app.railway.app";
```

### Test Connection

1. Compile and attach EAs to MT4/MT5
2. Check Railway logs for connection messages
3. Verify dashboard shows connected accounts

## 📊 Monitor Your Service

### Railway Dashboard

- **Deployments**: See build and deploy logs
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Variables**: Manage environment variables

### View Logs

In Railway dashboard → Deployments → View Logs:
```
🚀 Trade Bridge Service running on port 8080
📡 WebSocket endpoint: ws://0.0.0.0:8080
❤️  Health check: http://0.0.0.0:8080/health
✅ Connected to Redis
```

## 💰 Free Tier Limits

**Railway Free Tier:**
- $5 credit monthly (resets each month)
- Perfect for testing and small apps
- Automatic scaling up to 8GB RAM
- 100GB bandwidth
- No time limits

**Typical Usage:**
- Small VPS: ~$3-4/month
- Redis database: ~$1/month
- **Total**: Well within $5 free credit

## 🔄 Automatic Deployments

Railway automatically redeploys when you push to GitHub:
1. Make changes to your code
2. `git add . && git commit -m "Update trade bridge"`
3. `git push origin main`
4. Railway detects changes and redeploys

## 🆘 Troubleshooting

### Deployment Fails

1. Check Railway build logs
2. Verify all environment variables are set
3. Ensure Dockerfile.railway exists

### Can't Connect from MT4/MT5

1. Check Railway URL is correct
2. Verify WebSocket endpoint: `wss://your-app.railway.app`
3. Test health endpoint first
4. Check Railway logs for connection attempts

### Redis Connection Issues

1. Ensure Redis database is created in Railway
2. Check `REDIS_URL` environment variable exists
3. Look for Redis connection errors in logs

## 🎉 You're Done!

Your trade bridge is now running on Railway! 

**Next Steps:**
1. Test MT4/MT5 EA connections
2. Deploy your website to Vercel (separate guide)
3. Set up copy mappings in your dashboard
4. Start copying trades!

**Free Resources:**
- Trade Bridge: Railway (free)
- Database: Supabase (free)
- Redis: Railway (free)
- **Total Cost: $0** for testing