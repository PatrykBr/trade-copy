# 🚀 Simple Railway + Vercel Deployment

## Quick Setup (10 minutes)

### Step 1: Deploy Bridge Service to Railway
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. **Railway will automatically detect the service**

**Add these environment variables in Railway:**
```
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

### Step 2: Deploy Website to Vercel
1. Go to https://vercel.com
2. Click "New Project" → Import from GitHub
3. Select this repository
4. **Framework**: Next.js (auto-detected)
5. **Build Command**: `npm run build`

**Add these environment variables in Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BRIDGE_SERVICE_URL=wss://your-railway-app.railway.app
```

### Step 3: Test Everything
1. **Bridge Service**: Visit `https://your-railway-app.railway.app/health`
2. **Website**: Visit `https://your-app.vercel.app`
3. **Create account** and test login

## ✅ You're Done!

Your TradeCopy Pro platform is now live:
- 🌐 **Website**: Hosted on Vercel (free)
- 🚂 **Bridge**: Hosted on Railway (free $5 credit)
- 🗄️ **Database**: Supabase (free tier)

## 📱 MT4/MT5 Connection

To connect MT4/MT5, use these settings in your Expert Advisor:
- **Bridge URL**: `wss://your-railway-app.railway.app`
- **Account**: Your trading account number
- **API Key**: Any test key (for now)

---

**Total Cost: $0/month for testing** 🎉