# 🚀 TradeCopy Pro - Simple Deployment Guide

This guide will help you deploy TradeCopy Pro using the **simplest and most cost-effective** setup for testing and production.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │    Railway      │    │   Supabase      │
│                 │    │                 │    │                 │
│  Next.js App    │◄──►│ Trade Bridge    │◄──►│  PostgreSQL     │
│  (Website)      │    │ (WebSocket)     │    │  (Database)     │
│                 │    │     + Redis     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        ▲                       │
        ▼                        │                       ▼
┌─────────────────┐             │                ┌─────────────────┐
│     Stripe      │             │                │   Expert        │
│   (Payments)    │             └────────────────┤   Advisors      │
└─────────────────┘                              │  (MT4/MT5)      │
                                                 └─────────────────┘
```

**What goes where:**
- 🟢 **Vercel**: Your Next.js website (FREE)
- 🟡 **Railway**: WebSocket trade bridge service (~$5/month)
- 🟢 **Supabase**: Database (FREE tier)
- 🟡 **Stripe**: Payment processing (pay per transaction)

## 📋 Prerequisites

- [x] Node.js 18+ installed
- [x] Git installed
- [x] Supabase account (free)
- [x] Railway account (free $5 credit)
- [x] Vercel account (free)
- [x] Stripe account (free for testing)

## 🎯 Step 1: Supabase Setup (Database)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **"New Project"**
3. Choose a name like `tradecopy-pro`
4. Set a strong database password
5. Choose a region close to you

### 1.2 Get Your Keys
1. Go to **Settings → API**
2. Copy these values:
   ```
   Project URL: https://xxx.supabase.co
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 1.3 Apply Database Migrations
**The database is already set up!** ✅ 
(We applied all migrations in the previous conversation)

---

## 🚀 Step 2: Vercel Setup (Website)

### 2.1 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Import Project"**
3. Import your `trade-copy` repository
4. Vercel will auto-detect it's a Next.js app

### 2.2 Add Environment Variables
In Vercel dashboard → **Settings → Environment Variables**, add:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...

# Stripe (get from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### 2.3 Deploy
Click **"Deploy"** - Vercel will build and deploy automatically! 🎉

Your website will be live at: `https://your-app.vercel.app`

---

## 🛤️ Step 3: Railway Setup (Trade Bridge)

### 3.1 Create Railway Project
1. Go to [railway.app](https://railway.app) and sign up
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your `trade-copy` repository

### 3.2 Add Redis Service
1. In your Railway project, click **"New Service"**
2. Choose **"Database → Redis"**
3. Railway will create a Redis instance automatically

### 3.3 Configure Environment Variables
In Railway → **Variables**, add:

```bash
# Port (Railway sets this automatically)
PORT=8080

# Supabase (same as Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...

# Redis (Railway provides this automatically)
# REDIS_URL will be auto-set by Railway Redis service
```

### 3.4 Deploy
Railway will automatically deploy your trade bridge service! 🚀

**Your WebSocket server will be live at**: `https://your-app.railway.app`

---

## 💳 Step 4: Stripe Setup (Payments)

### 4.1 Create Stripe Products
1. Go to [stripe.com](https://stripe.com) dashboard
2. **Products → Add Product**

Create these plans:
```
Starter Plan:
- Name: "Starter"
- Price: $29/month
- Copy the Price ID

Pro Plan:
- Name: "Pro" 
- Price: $99/month
- Copy the Price ID

Enterprise Plan:
- Name: "Enterprise"
- Price: $299/month
- Copy the Price ID
```

### 4.2 Add Price IDs to Environment
Update both **Vercel** and **Railway** with the Price IDs:
```bash
STRIPE_STARTER_PRICE_ID=price_1ABC...
STRIPE_PRO_PRICE_ID=price_1DEF...
STRIPE_ENTERPRISE_PRICE_ID=price_1GHI...
```

### 4.3 Set Up Webhook
1. **Stripe Dashboard → Developers → Webhooks**
2. **Add endpoint**: `https://your-app.vercel.app/api/stripe/webhook`
3. **Select events**: `customer.subscription.*`, `invoice.*`
4. Copy the **Webhook Secret** to your environment variables

---

## 🔧 Step 5: Expert Advisors (MT4/MT5)

### 5.1 Download EAs
Your Expert Advisors are ready in the `experts/` folder:
- `experts/MT4/TradeCopy_Monitor.mq4`
- `experts/MT4/TradeCopy_Executor.mq4`
- `experts/MT5/TradeCopy_Monitor.mq5`
- `experts/MT5/TradeCopy_Executor.mq5`

### 5.2 Install in MetaTrader
1. **Open MetaTrader 4 or 5**
2. **File → Open Data Folder**
3. **Copy files to**: `MQL4/Experts/` or `MQL5/Experts/`
4. **Restart MetaTrader**

### 5.3 Configure EAs
1. **Drag EA to chart**
2. **In settings, set**:
   ```
   WebSocketURL = wss://your-app.railway.app
   AccountAuth = your-account-auth-token
   ```

---

## ✅ Step 6: Testing Your Setup

### 6.1 Test Website
1. Go to your Vercel URL: `https://your-app.vercel.app`
2. Sign up for an account
3. Try creating a trading account
4. Test the subscription flow

### 6.2 Test Trade Bridge
1. Check Railway logs for your WebSocket service
2. Install EAs in MT4/MT5
3. Verify connection in Railway logs

### 6.3 Test Trade Copying
1. Set up a master and slave account
2. Create a copy mapping
3. Place a trade on the master account
4. Verify it's copied to the slave account

---

## 💰 Cost Breakdown

| Service | Free Tier | Paid (Monthly) |
|---------|-----------|----------------|
| **Vercel** | ✅ Free forever | $20/month for Pro |
| **Railway** | $5 credit/month | ~$5-10/month |
| **Supabase** | ✅ Free up to 500MB | $25/month for Pro |
| **Stripe** | ✅ Free + 2.9% fees | Same |
| **TOTAL** | **~$0-5/month** | **~$50-55/month** |

**For testing: Essentially FREE!** 🎉

---

## 🔧 Local Development

### Run Everything Locally:
```bash
# 1. Install dependencies
npm install

# 2. Set up .env.local (copy from .env.example)
cp .env.example .env.local

# 3. Start Next.js
npm run dev

# 4. Start trade bridge (separate terminal)
npm run start:bridge
```

---

## 🚨 Troubleshooting

### Common Issues:

**1. "Supabase connection failed"**
- ✅ Check your URL and keys in environment variables
- ✅ Verify Supabase project is active

**2. "WebSocket connection failed"**
- ✅ Check Railway service is running
- ✅ Verify Railway domain in EA settings

**3. "Stripe webhook failed"**
- ✅ Check webhook URL in Stripe dashboard
- ✅ Verify webhook secret in environment variables

**4. "Build failed on Railway"**
- ✅ Check Railway build logs
- ✅ Verify `package.json` scripts are correct

### Getting Help:
- 📧 Check Railway/Vercel/Supabase logs
- 🔍 Look at browser console for errors
- 📝 Check that all environment variables are set correctly

---

## 🎯 Next Steps

Once everything is working:

1. **🔒 Enable Production Mode**: Switch Stripe to live mode
2. **🌍 Custom Domain**: Add your domain to Vercel
3. **📊 Monitoring**: Add error tracking (Sentry)
4. **⚡ Scaling**: Railway auto-scales based on usage
5. **🛡️ Security**: Enable Supabase RLS policies

**You're ready to trade! 🚀**

---

## 📞 Support

Need help? Check the logs:
- **Vercel**: Functions → View Logs
- **Railway**: Service → View Logs  
- **Supabase**: Logs & Reports

**Happy Trading!** 💰