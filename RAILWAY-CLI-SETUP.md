# Railway CLI Deployment (Alternative Method)

## Install Railway CLI
```bash
npm install -g @railway/cli
```

## Login and Deploy
```bash
# Login to Railway
railway login

# Link to your project (or create new one)
railway link

# Add environment variables
railway variables set SUPABASE_URL=https://ifmqpzgqrmhhzrvfrurp.supabase.co
railway variables set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXFwemdxcm1oaHpydmZydXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc5NzQ2MCwiZXhwIjoyMDczMzczNDYwfQ.HRwpPjZcfuGre14KQPfn2UelMuXS7Z0hPZ4cCF4dzcg
railway variables set PORT=8080
railway variables set NODE_ENV=production

# Deploy
railway up
```

This method ensures Railway uses the correct Dockerfile and environment variables.