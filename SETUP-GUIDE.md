# 🚀 TradeCopy Pro - Complete Setup Guide for Beginners

This guide will help you set up your own MT4/MT5 trade copying platform from scratch, even if you're new to programming. Follow these steps carefully and you'll have a working system!

## 📋 What You'll Need

### Prerequisites
- A computer with Windows, Mac, or Linux
- Basic familiarity with command line/terminal
- About 2-3 hours of setup time
- $20-50/month for hosting (we'll use DigitalOcean)

### Accounts You'll Create
1. **GitHub account** (free) - to store your code
2. **Supabase account** (free tier) - for database
3. **Stripe account** (free) - for payments
4. **DigitalOcean account** (paid) - for hosting

## 🔧 Step 1: Set Up Your Development Environment

### Install Required Software

**On Windows:**
1. Download and install [Git](https://git-scm.com/download/win)
2. Download and install [Node.js](https://nodejs.org/) (choose the LTS version)
3. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

**On Mac:**
1. Install Homebrew by opening Terminal and running:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Install the required tools:
   ```bash
   brew install git node docker
   ```

**On Linux (Ubuntu/Debian):**
```bash
# Update your system
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Verify Installation
Open your terminal/command prompt and run these commands to verify everything is installed:
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
git --version     # Should show git version
docker --version  # Should show Docker version
```

## 🗄️ Step 2: Set Up Your Database (Supabase)

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up for free
2. Click "New Project"
3. Choose your organization (create one if needed)
4. Fill in project details:
   - **Name**: `tradecopypro`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait 2-3 minutes

### Get Your Supabase Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (looks like: `https://xxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role secret** (starts with `eyJ...`)

## 💳 Step 3: Set Up Payments (Stripe)

### Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete the account verification process
3. Go to **Developers** → **API keys**
4. Copy these values:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

### Create Webhook
1. In Stripe dashboard, go to **Developers** → **Webhooks**
2. Click "Add endpoint"
3. Enter endpoint URL: `https://yourdomain.com/api/stripe/webhook` (we'll update this later)
4. Select these events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Webhook signing secret** (starts with `whsec_...`)

## 💻 Step 4: Download and Setup the Code

### Get the Code
1. Open your terminal/command prompt
2. Navigate to where you want to store the project:
   ```bash
   cd Desktop  # or wherever you prefer
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/trade-copy.git
   cd trade-copy
   ```

### Install Dependencies
```bash
npm install
```

### Create Environment File
Create a file called `.env.local` in the project root with your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Stripe Configuration (Test Keys for now)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
STRIPE_SECRET_KEY=sk_test_your-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
```

**Important:** Replace all the placeholder values with your actual credentials from steps 2 and 3!

## 🏗️ Step 5: Set Up the Database Schema

### Run Database Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

If you get errors, you can also run the migrations manually:
1. Go to your Supabase dashboard
2. Click **SQL Editor**
3. Open each file in `supabase/migrations/` and run them in order

## 🧪 Step 6: Test Locally

### Start the Development Server
```bash
npm run dev
```

You should see:
```
✓ Ready on http://localhost:3000
```

### Test the Application
1. Open your browser and go to `http://localhost:3000`
2. You should see your TradeCopy Pro homepage
3. Try creating an account and logging in
4. Check if you can access the dashboard

## 🌐 Step 7: Deploy to Production

### Create a DigitalOcean Droplet
1. Go to [digitalocean.com](https://digitalocean.com) and sign up
2. Click "Create" → "Droplets"
3. Choose these settings:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic - $24/month (4GB RAM, 2 CPUs)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or Password
4. Click "Create Droplet"

### Connect to Your Server
```bash
# Replace YOUR_SERVER_IP with your actual server IP
ssh root@YOUR_SERVER_IP
```

### Setup Your Server
Run these commands on your server:

```bash
# Update the system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
apt install git -y

# Clone your project
git clone https://github.com/yourusername/trade-copy.git
cd trade-copy
```

### Configure Production Environment
```bash
# Create production environment file
nano .env.production
```

Add your production configuration:
```bash
# Supabase Configuration (same as before)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration (Use LIVE keys for production!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-live-key
STRIPE_SECRET_KEY=sk_live_your-live-secret
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Domain Configuration
DOMAIN=yourdomain.com
EMAIL=your-email@yourdomain.com
```

### Deploy the Application
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The deployment script will:
- Set up monitoring
- Configure SSL certificates
- Start all services
- Run health checks

## 🌍 Step 8: Configure Your Domain

### Point Your Domain to the Server
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update DNS records:
   - **A Record**: `yourdomain.com` → `YOUR_SERVER_IP`
   - **A Record**: `*.yourdomain.com` → `YOUR_SERVER_IP`

### Update Stripe Webhook URL
1. Go back to Stripe dashboard → **Developers** → **Webhooks**
2. Edit your webhook endpoint
3. Update URL to: `https://yourdomain.com/api/stripe/webhook`

## 📱 Step 9: Set Up the MT4/MT5 Expert Advisors

### Prepare the EAs for Distribution
1. The EA files are in the `experts/` folder:
   - `experts/MT4/TradeCopy_Monitor.mq4` (for master accounts)
   - `experts/MT4/TradeCopy_Executor.mq4` (for slave accounts)
   - `experts/MT5/TradeCopy_Monitor.mq5` (for master accounts)
   - `experts/MT5/TradeCopy_Executor.mq5` (for slave accounts)

2. Compile the EAs in MetaEditor:
   - Open MetaTrader 4/5
   - Press F4 to open MetaEditor
   - Open each .mq4/.mq5 file
   - Press F7 to compile
   - This creates .ex4/.ex5 files

### Configure the EAs
Edit the EA parameters before distributing:
```mql4
input string WebSocketURL = "wss://yourdomain.com:8080";  // Your server
input string AccountNumber = "";  // Users will enter their account number
input string APIKey = "";         // Users will get this from your website
```

### User Instructions for EA Setup
Create instructions for your users:

1. **Download the EAs** from your website
2. **Copy to MT4/MT5**:
   - For MT4: Copy to `MT4 Data Folder/MQL4/Experts/`
   - For MT5: Copy to `MT5 Data Folder/MQL5/Experts/`
3. **Configure Settings**:
   - WebSocket URL: `wss://yourdomain.com:8080`
   - Account Number: Their trading account number
   - API Key: Generated from your website dashboard
4. **Attach to Chart**:
   - Drag EA to any chart
   - Enable "Allow DLL imports"
   - Enable "Allow WebRequest URLs"
   - Add your domain to allowed URLs

## 📊 Step 10: Monitor Your System

### Access Monitoring Dashboards
- **Main App**: `https://yourdomain.com`
- **Monitoring**: `https://monitoring.yourdomain.com`
- **Traefik Dashboard**: `https://traefik.yourdomain.com`

### Check System Health
```bash
# View running services
docker-compose --env-file .env.production ps

# Check logs
docker-compose --env-file .env.production logs -f

# Monitor resource usage
docker stats
```

## 🔧 Common Issues and Solutions

### "Can't connect to database"
- Check your Supabase credentials in `.env.production`
- Verify your Supabase project is running
- Check firewall settings

### "Webhook errors in Stripe"
- Verify webhook URL is correct: `https://yourdomain.com/api/stripe/webhook`
- Check webhook signing secret
- Test webhook delivery in Stripe dashboard

### "EAs not connecting"
- Check WebSocket URL in EA settings
- Verify port 8080 is open
- Check domain DNS configuration
- Ensure SSL certificate is working

### "High server costs"
- Start with smaller DigitalOcean droplet
- Monitor resource usage with `docker stats`
- Scale up only when needed

## 📈 Scaling Your Platform

### As Your User Base Grows

**100-500 Users:**
- Current setup should handle this fine
- Monitor server resources

**500-2000 Users:**
- Upgrade to $48/month DigitalOcean droplet (8GB RAM)
- Consider Supabase Pro plan ($25/month)

**2000+ Users:**
- Scale horizontally:
  ```bash
  # Add more trade bridge instances
  docker-compose --env-file .env.production up -d --scale trade-bridge=3
  ```
- Consider multiple servers with load balancing

## 🎯 Marketing Your Platform

### Key Selling Points
- **Fastest copying**: Sub-second trade copying
- **No external dependencies**: Users don't need other services
- **Easy setup**: Just run the EA, no configuration
- **Real-time monitoring**: Live dashboard with performance metrics
- **Reliable**: 99.9% uptime with automatic failover

### Pricing Strategy
- **Free Tier**: 2 accounts, basic features
- **Pro**: $29/month, 10 accounts, advanced analytics
- **Enterprise**: $99/month, unlimited accounts, priority support

## 📞 Getting Help

### When Things Go Wrong
1. **Check the logs** first:
   ```bash
   docker-compose --env-file .env.production logs [service-name]
   ```

2. **Restart services** if needed:
   ```bash
   docker-compose --env-file .env.production restart
   ```

3. **Monitor resources**:
   ```bash
   docker stats
   htop  # or top
   ```

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `/docs` folder for technical details
- **Discord**: Join the community for real-time help

## 🎉 You're Ready!

Congratulations! You now have a fully functional MT4/MT5 trade copying platform. Here's what you can do next:

1. **Test thoroughly** with demo accounts
2. **Create user documentation** for EA setup
3. **Set up customer support** channels
4. **Plan your marketing strategy**
5. **Start onboarding users**

Remember: Start small, test everything, and scale gradually as your user base grows. You've built something truly powerful - a platform that can compete with the biggest names in the industry!

## 📚 Additional Resources

### Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Guides](https://supabase.com/docs)
- [Docker Tutorial](https://docs.docker.com/get-started/)
- [MQL4/MQL5 Programming](https://www.mql5.com/en/docs)

### Tools You'll Use
- **VS Code**: Code editor with great extensions
- **Git**: Version control for your code
- **Postman**: API testing
- **MetaEditor**: For EA development

---

**Need help?** Don't hesitate to ask questions in the GitHub issues or join our Discord community. We're here to help you succeed! 🚀