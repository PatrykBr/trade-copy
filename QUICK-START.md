# 🚀 Quick Start - Free Deployment

## 📋 **TL;DR - What You Need**

Since you're deploying to **Vercel**, you only need:
1. **Vercel** (Free) - Your Next.js website  
2. **Railway** (Free $5 credit) - Trade Bridge WebSocket service
3. **Supabase** (Free) - Database (already set up!)

**Total cost: $0** ✨

---

## 🏃‍♂️ **5-Minute Setup**

### **Step 1: Deploy to Vercel** (2 minutes)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy your website
vercel --prod
```

Add these environment variables in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### **Step 2: Deploy Trade Bridge to Railway** (3 minutes)

1. **Sign up**: [railway.app](https://railway.app) with GitHub
2. **New Project** → **Deploy from GitHub** → Select your repo
3. **Add Redis**: Click "Add Service" → "Redis"
4. **Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   PORT=8080
   NODE_ENV=production
   ```
5. **Done!** Railway auto-deploys from your GitHub

### **Step 3: Update Configuration**
Update your Vercel environment variables:
```
NEXT_PUBLIC_TRADE_BRIDGE_URL=https://your-railway-app.up.railway.app
```

---

## ✅ **That's It!**

Your architecture:
```
Vercel Website ←→ Railway Trade Bridge ←→ Supabase Database
                         ↓
                    MT4/MT5 EAs
```

**Next**: Install the MT4/MT5 Expert Advisors and start testing trade copying!

---

## 🆘 **Need Help?**

- **Railway not working?** Try Render.com (also free)
- **WebSocket issues?** Check firewall settings
- **EA connection problems?** Verify the Trade Bridge URL in EA settings

The free tiers are perfect for development and testing. When you're ready to scale, both services offer easy upgrades.