# 🚀 Free Deployment Guide - Simplified Architecture

Since you're deploying the **Next.js website to Vercel**, we only need to deploy the **Trade Bridge WebSocket service** to a free backend service. Here are your best options:

## 🎯 **Recommended Setup: Vercel + Railway**

### **Architecture Overview:**
```
Vercel (Website) ←→ Railway (Trade Bridge) ←→ Supabase (Database)
                              ↓
                         MT4/MT5 EAs
```

---

## 🚂 **Option 1: Railway (Recommended)**

### **Why Railway?**
- ✅ **$5/month free credit** (plenty for small services)
- ✅ **Built-in Redis** (perfect for our message queue)
- ✅ **Easy deployment** from GitHub
- ✅ **WebSocket support**
- ✅ **No sleep** (unlike Render's free tier)

### **Railway Setup Steps:**

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub

2. **Create new project**: 
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your `trade-copy` repository

3. **Configure the service**:
   ```bash
   # Railway will automatically detect the Dockerfile.trade-bridge
   # Add these environment variables in Railway dashboard:
   ```
   
   **Environment Variables for Railway:**
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   REDIS_URL=redis://red-xxxxx:6379  # Railway provides this
   PORT=8080
   NODE_ENV=production
   ```

4. **Add Redis**:
   - In Railway dashboard, click "Add Service"
   - Choose "Redis"
   - It will automatically provide `REDIS_URL`

5. **Deploy**:
   - Push to your GitHub repo
   - Railway auto-deploys!

---

## 🎨 **Option 2: Render (Alternative)**

### **Render Setup Steps:**

1. **Sign up**: Go to [render.com](https://render.com)

2. **Create Web Service**:
   - Connect GitHub repository
   - Choose "Docker"
   - Set Dockerfile path: `Dockerfile.trade-bridge`

3. **Configure**:
   ```
   Name: trade-bridge
   Region: Oregon (US West)
   Branch: main
   Build Command: (leave empty - Docker handles it)
   Start Command: (leave empty - Docker handles it)
   ```

4. **Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   PORT=8080
   NODE_ENV=production
   ```

5. **Add Redis** (separate service):
   - Create new "Redis" service
   - Copy the Redis URL to your web service env vars

**⚠️ Note**: Render free tier services sleep after 15 minutes of inactivity.

---

## 🛩️ **Option 3: Fly.io (Advanced)**

### **Fly.io Setup:**

1. **Install CLI**: `npm install -g @fly.io/cli`
2. **Login**: `fly auth login`
3. **Initialize**: `fly launch` (in your project directory)
4. **Deploy**: `fly deploy`

**Free tier**: 3 micro VMs (256MB each)

---

## 🌐 **Vercel Deployment (Your Website)**

### **Environment Variables for Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_TRADE_BRIDGE_URL=https://your-railway-app.up.railway.app
```

### **Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 🔧 **Configuration Updates Needed**

You'll need to update the WebSocket connection in your Next.js app to point to your deployed trade bridge:

**In your Next.js app** (`src/lib/trade-bridge-client.ts` or similar):
```typescript
const TRADE_BRIDGE_URL = process.env.NEXT_PUBLIC_TRADE_BRIDGE_URL || 'ws://localhost:8080';
```

---

## 💰 **Cost Breakdown (All Free for Testing)**

| Service | Free Tier | Perfect For |
|---------|-----------|-------------|
| **Vercel** | Unlimited personal projects | Next.js website |
| **Railway** | $5/month credit | Trade Bridge + Redis |
| **Supabase** | 500MB DB, 2GB bandwidth | Database |
| **Stripe** | Free in test mode | Payment testing |

**Total Cost**: **$0** for development and testing! 🎉

---

## 🎯 **My Recommendation**

**Use Railway** because:
- ✅ No service sleeping (unlike Render)
- ✅ Built-in Redis (no separate setup)
- ✅ Great developer experience
- ✅ Easy scaling when you need it
- ✅ $5 credit covers small apps for months

The $5/month credit from Railway is more than enough for testing - a small WebSocket service typically uses $1-2/month.

Would you like me to help you set up Railway, or do you prefer one of the other options?