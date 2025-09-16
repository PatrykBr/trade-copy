# 🧪 Testing Your TradeCopy Pro Setup

## Quick Local Testing

### 1. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
```

### 2. Test Bridge Service Locally
```bash
# Start the bridge service
npm run start:bridge

# In another terminal, test health endpoint
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "connections": 0,
  "timestamp": "2025-09-16T..."
}
```

### 3. Test Website Locally
```bash
# Start Next.js development server
npm run dev

# Open browser: http://localhost:3000
```

## 🆓 Free Cloud Hosting Comparison

| Platform | Free Tier | Best For | Setup Difficulty |
|----------|-----------|----------|------------------|
| **Railway** ⭐ | $5/month credit | Testing & development | Easy (GitHub → Deploy) |
| **Render** | 750 hours/month | Long-term free hosting | Easy (sleeps after 15min) |
| **Fly.io** | 3 VMs, 160GB | Production-like testing | Medium (Docker required) |
| **Heroku** | $7/month eco dyno | Reliable production | Easy (but paid) |

## 🚀 Recommended Setup for You

Since you're deploying the **website to Vercel** and need a **free bridge service**:

### Option 1: Railway (Recommended)
✅ **$5/month credit = free for months**  
✅ **Never sleeps**  
✅ **Automatic HTTPS**  
✅ **GitHub integration**  
✅ **Easy environment variables**  

**Setup**: Connect GitHub → Add env vars → Deploy

### Option 2: Render (Alternative)
✅ **Truly free forever**  
✅ **Easy deployment**  
⚠️ **Sleeps after 15min** (wakes up automatically)  
⚠️ **45-second cold start**  

**Setup**: Connect GitHub → Add env vars → Deploy

## 📋 Complete Deployment Checklist

### Prerequisites ✅
- [ ] GitHub account created
- [ ] Railway/Render account created  
- [ ] Vercel account created
- [ ] Supabase project set up
- [ ] Environment variables ready

### Bridge Service Deployment ✅
- [ ] Push code to GitHub
- [ ] Connect GitHub to Railway/Render
- [ ] Add environment variables
- [ ] Deploy service
- [ ] Test health endpoint
- [ ] Note down service URL

### Website Deployment ✅
- [ ] Connect GitHub to Vercel
- [ ] Add all environment variables
- [ ] Add bridge service URL
- [ ] Deploy website
- [ ] Test login/dashboard

### Final Testing ✅
- [ ] Create test trading account
- [ ] Test WebSocket connection
- [ ] Verify database logging
- [ ] Test trade copying flow

## 🔧 Environment Variables Reference

### For Bridge Service (Railway/Render)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3001
NODE_ENV=production
```

### For Website (Vercel)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BRIDGE_SERVICE_URL=wss://your-app.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## 🚨 Common Issues & Solutions

### Bridge Service Won't Start
```bash
# Check logs
railway logs  # or render logs

# Common issues:
1. Missing environment variables
2. Wrong Node.js version
3. Dependencies not installed
```

### Website Build Fails
```bash
# Check Vercel build logs
# Common issues:
1. TypeScript errors
2. Missing environment variables
3. Import path issues
```

### MT4/MT5 Can't Connect
```bash
# Check bridge service health
curl https://your-app.railway.app/health

# Common issues:
1. Wrong WebSocket URL
2. Firewall blocking connections
3. Invalid account credentials
```

## 💡 Pro Tips

### Testing Strategy
1. **Start local** → Test everything works
2. **Deploy bridge** → Test health endpoint
3. **Deploy website** → Test full flow
4. **Add MT4/MT5** → Test real trading

### Cost Optimization
- **Railway**: $5 credit lasts 2-3 months for testing
- **Render**: Free forever but sleeps
- **Scale up** only when you have paying users

### Monitoring
- **Railway**: Built-in logs and metrics
- **Render**: Basic logs in dashboard
- **Supabase**: Real-time database logs

## ✅ Success Criteria

Your setup is working when:
1. ✅ Bridge health check returns 200 OK
2. ✅ Website loads and login works
3. ✅ Trading accounts can be created
4. ✅ MT4/MT5 can connect to bridge
5. ✅ Trades appear in Supabase database

**Total setup time: ~30 minutes** 🚀