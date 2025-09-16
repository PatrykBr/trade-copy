# 🚂 Railway Deployment Guide - Updated

## ✅ **Latest Fixes Applied:**
- Fixed `railway.toml` TOML syntax error  
- Added `/health` endpoint to trade bridge
- Simplified Dockerfile for Railway
- Added standalone Supabase client

---

## 🎯 **Option 1: Railway Dashboard (Simplest)**

1. **Go to Railway Dashboard**: [railway.app/dashboard](https://railway.app/dashboard)
2. **Delete existing service** (if it keeps failing)
3. **Create New Project** → **Deploy from GitHub** → Select `trade-copy`
4. **Set Environment Variables**:
   ```
   SUPABASE_URL=https://ifmqpzgqrmhhzrvfrurp.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXFwemdxcm1oaHpydmZydXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc5NzQ2MCwiZXhwIjoyMDczMzczNDYwfQ.HRwpPjZcfuGre14KQPfn2UelMuXS7Z0hPZ4cCF4dzcg
   PORT=8080
   NODE_ENV=production
   ```

5. **Set Dockerfile Path**: `Dockerfile.trade-bridge` (in Build settings)
6. **Add Redis Service**: Add Service → Redis
7. **Deploy**

---

## 🎯 **Option 2: Test Locally First**

Before deploying to Railway, let's make sure everything works locally:

### **Start Local Trade Bridge:**
```bash
# Install Redis locally (Windows)
# Download from: https://redis.io/download
# Or use Docker: docker run -d -p 6379:6379 redis

# Start trade bridge
npm run trade-bridge:dev
```

### **Test the Health Endpoint:**
```bash
# In another terminal
curl http://localhost:8080/health
# Should return: OK
```

### **Test WebSocket Connection:**
```bash
# Test WebSocket (optional)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8080/
```

---

## 🎯 **Option 3: Alternative Free Hosts**

If Railway keeps failing, try these **free alternatives**:

### **A. Render.com**
1. Connect GitHub repo
2. Choose **Docker** deployment
3. Set Dockerfile path: `Dockerfile.trade-bridge`
4. Add environment variables
5. **Warning**: Service sleeps after 15min inactivity

### **B. Fly.io**
```bash
# Install Fly CLI
npm install -g flyctl

# Login and deploy
fly auth login
fly launch --dockerfile Dockerfile.trade-bridge
fly deploy
```

### **C. Heroku (with containers)**
```bash
# Install Heroku CLI, then:
heroku create your-trade-bridge
heroku stack:set container
heroku config:set SUPABASE_URL=https://ifmqpzgqrmhhzrvfrurp.supabase.co
heroku config:set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXFwemdxcm1oaHpydmZydXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc5NzQ2MCwiZXhwIjoyMDczMzczNDYwfQ.HRwpPjZcfuGre14KQPfn2UelMuXS7Z0hPZ4cCF4dzcg
heroku config:set PORT=8080
git push heroku main
```

---

## 🎯 **Option 4: Just Use Vercel for Everything**

Since your **website is already on Vercel**, you could also:

1. **Deploy trade bridge as Vercel API route** (simpler but less scalable)
2. **Use Vercel Edge Functions** for WebSocket handling
3. **Skip external hosting entirely** for now

---

## 🛟 **What to Try:**

1. **First**: Test locally with `npm run trade-bridge:dev`
2. **If local works**: Try Railway dashboard (delete + recreate)
3. **If Railway fails**: Try Render.com as backup
4. **Final option**: Use Vercel API routes instead

The core system is **ready and working** - we just need to get it deployed somewhere that supports WebSockets! 🚀