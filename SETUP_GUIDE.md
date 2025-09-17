# 🚀 TradeCopy Pro - Complete Setup Guide

## 📋 **Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Free VPS Setup Options](#free-vps-setup-options)
5. [VPS Configuration for Trading](#vps-configuration-for-trading)
6. [Production Deployment](#production-deployment)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 **Prerequisites**

### Required Software
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

### Required Accounts
- **Supabase Account** - [Sign up free](https://supabase.com/)
- **Stripe Account** - [Sign up](https://stripe.com/) (for payments)
- **Free VPS Provider** (see options below)

---

## 💻 **Local Development Setup**

### 1. Clone the Repository
```bash
git clone https://github.com/PatrykBr/trade-copy.git
cd trade-copy
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Custom Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🗄️ **Supabase Configuration**

### 1. Create New Supabase Project
1. Go to [supabase.com](https://supabase.com/)
2. Click "New Project"
3. Choose organization and set project name: `trade-copy-pro`
4. Set database password (save this!)
5. Choose region closest to you

### 2. Get API Keys
1. Go to **Settings** → **API**
2. Copy `Project URL` and `anon public` key
3. Copy `service_role secret` key (keep this secure!)

### 3. Set Up Database Schema
Run the migration files in order in the Supabase SQL editor:

```sql
-- Copy content from supabase/migrations/ files in chronological order
-- 1. First run the initial schema
-- 2. Then run VPS infrastructure migrations
-- 3. Finally run any additional migrations
```

### 4. Configure Row Level Security (RLS)
The migrations include RLS policies, but verify they're active:
- Go to **Authentication** → **Policies**
- Ensure all tables have appropriate policies enabled

---

## 🆓 **Free VPS Setup Options**

### **Option 1: Oracle Cloud Always Free Tier** ⭐ **RECOMMENDED**

**What you get FREE:**
- 2 AMD-based Compute VMs (1/8 OCPU, 1 GB memory each)
- OR 1 ARM-based VM (4 OCPUs, 24 GB memory)
- 100 GB boot volume storage
- 10 TB outbound data transfer per month

**Setup Steps:**
1. **Sign up**: [cloud.oracle.com](https://cloud.oracle.com/)
2. **Create VM Instance**:
   ```
   Shape: VM.Standard.E2.1.Micro (Always Free)
   Image: Ubuntu 22.04 LTS
   Memory: 1 GB RAM
   Storage: 50 GB
   ```
3. **Configure Security Rules**:
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)
   - Allow custom ports (3000, 8080)

### **Option 2: Google Cloud Platform Free Tier**

**What you get FREE:**
- 1 f1-micro instance (0.2 vCPU, 0.6 GB memory)
- 30 GB persistent disk storage
- $300 credit for first 90 days

**Setup Steps:**
1. **Sign up**: [cloud.google.com](https://cloud.google.com/)
2. **Create Compute Engine Instance**:
   ```
   Machine type: f1-micro
   Boot disk: Ubuntu 22.04 LTS (20 GB)
   Firewall: Allow HTTP/HTTPS traffic
   ```

### **Option 3: AWS Free Tier**

**What you get FREE:**
- 1 t2.micro instance (1 vCPU, 1 GB memory)
- 750 hours per month for 12 months
- 30 GB EBS storage

**Setup Steps:**
1. **Sign up**: [aws.amazon.com](https://aws.amazon.com/)
2. **Launch EC2 Instance**:
   ```
   Instance type: t2.micro
   AMI: Ubuntu Server 22.04 LTS
   Storage: 20 GB GP2
   Security Group: HTTP, HTTPS, SSH
   ```

### **Option 4: Alternative Free Providers**

| Provider | Free Specs | Limitations |
|----------|------------|-------------|
| **Railway** | 512MB RAM, shared CPU | $5 credit monthly |
| **Render** | 512MB RAM, 0.1 CPU | Spins down after 15min idle |
| **Fly.io** | 256MB RAM, shared CPU | 3 micro VMs free |
| **DigitalOcean** | $200 credit for 60 days | Credit-based trial |

---

## ⚙️ **VPS Configuration for Trading**

### 1. Initial Server Setup

**Connect to your VPS:**
```bash
# Replace with your VPS IP
ssh ubuntu@YOUR_VPS_IP
```

**Update system:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install essential packages:**
```bash
sudo apt install -y curl wget git htop unzip
```

### 2. Install Node.js & PM2

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Verify installation
node --version
npm --version
```

### 3. Install Docker (for VPS containers)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 4. Set Up Trading Platform Environment

**Create trading directory:**
```bash
mkdir -p /home/ubuntu/trading-platforms
cd /home/ubuntu/trading-platforms
```

**Create Wine environment for MT4/MT5:**
```bash
# Install Wine for running Windows MT4/MT5
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install -y wine wine32 wine64

# Configure Wine
winecfg
# Set to Windows 10 mode in the dialog
```

**Create MT4/MT5 directories:**
```bash
mkdir -p ./mt4/{data,logs,config}
mkdir -p ./mt5/{data,logs,config}
mkdir -p ./monitoring/{scripts,logs}
```

### 5. Deploy Your Application

**Clone and setup your app:**
```bash
cd /home/ubuntu
git clone https://github.com/PatrykBr/trade-copy.git
cd trade-copy

# Install dependencies
npm install

# Create production environment file
cp .env.local .env.production
# Edit with your production values
nano .env.production
```

**Build the application:**
```bash
npm run build
```

**Start with PM2:**
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'trade-copy-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'trade-copy-worker',
      script: './scripts/worker.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
    }
  ]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo tee /etc/nginx/sites-available/trade-copy << EOF
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/trade-copy /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 7. Set Up SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace YOUR_DOMAIN)
sudo certbot --nginx -d YOUR_DOMAIN

# Auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔧 **VPS Management Configuration**

### 1. Create VPS Manager Script

```bash
mkdir -p /home/ubuntu/trade-copy/scripts
cat > /home/ubuntu/trade-copy/scripts/vps-manager.js << 'EOF'
#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

class VPSManager {
  constructor() {
    this.platformPath = '/home/ubuntu/trading-platforms';
    this.instances = new Map();
  }

  async startMT4Instance(accountConfig) {
    const { accountId, login, password, server } = accountConfig;
    
    console.log(`Starting MT4 instance for account ${accountId}`);
    
    // Create MT4 configuration
    const configPath = `${this.platformPath}/mt4/config/mt4_${accountId}.ini`;
    const config = `
[Common]
Login=${login}
Password=${password}
Server=${server}
EnableDDE=false
EnableNews=false
EnableSounds=false
ProxyEnable=false
`;
    
    fs.writeFileSync(configPath, config);
    
    // Start MT4 with Wine
    const command = `cd ${this.platformPath}/mt4 && wine terminal.exe /config:${configPath}`;
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`MT4 start error: ${error}`);
          reject(error);
        } else {
          console.log(`MT4 started for account ${accountId}`);
          resolve(true);
        }
      });
    });
  }

  async monitorInstances() {
    // Check running MT4/MT5 processes
    exec('pgrep -f terminal.exe', (error, stdout, stderr) => {
      const processes = stdout.trim().split('\n').filter(pid => pid);
      console.log(`Active trading platform instances: ${processes.length}`);
    });
  }

  async getSystemHealth() {
    return new Promise((resolve) => {
      exec('free -m && df -h && uptime', (error, stdout, stderr) => {
        const lines = stdout.split('\n');
        resolve({
          memory: lines[1],
          disk: lines.find(l => l.includes('/dev/')),
          uptime: lines[lines.length - 2],
          timestamp: new Date().toISOString()
        });
      });
    });
  }
}

// Export for use in main application
module.exports = VPSManager;

// CLI usage
if (require.main === module) {
  const manager = new VPSManager();
  
  setInterval(async () => {
    await manager.monitorInstances();
    const health = await manager.getSystemHealth();
    console.log('System Health:', health);
  }, 30000);
}
EOF

chmod +x /home/ubuntu/trade-copy/scripts/vps-manager.js
```

### 2. Create Monitoring Scripts

```bash
# Create system monitoring script
cat > /home/ubuntu/trade-copy/scripts/monitor.sh << 'EOF'
#!/bin/bash

# System monitoring script for VPS
LOG_FILE="/home/ubuntu/trade-copy/logs/vps-monitor.log"
mkdir -p /home/ubuntu/trade-copy/logs

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get system metrics
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
    
    # Log metrics
    echo "$TIMESTAMP CPU:${CPU_USAGE}% MEM:${MEMORY_USAGE}% DISK:${DISK_USAGE}% LOAD:${LOAD_AVG}" >> $LOG_FILE
    
    # Check if we need to restart services
    if ! pgrep -f "npm.*start" > /dev/null; then
        echo "$TIMESTAMP WARNING: Main application not running, restarting..." >> $LOG_FILE
        cd /home/ubuntu/trade-copy && pm2 restart all
    fi
    
    sleep 60
done
EOF

chmod +x /home/ubuntu/trade-copy/scripts/monitor.sh

# Start monitoring in background
nohup /home/ubuntu/trade-copy/scripts/monitor.sh &
```

---

## 🚀 **Production Deployment**

### 1. Update Supabase with VPS Information

Add your VPS to the database:

```sql
-- Insert your VPS instance
INSERT INTO vps_instances (name, host, region, capacity, status, platform_versions)
VALUES (
    'free-vps-main',
    'YOUR_VPS_IP_ADDRESS',
    'us-east-1',
    10, -- Capacity for free VPS (lower)
    'active',
    '{"mt4": "build 1380", "mt5": "build 3815"}'
);
```

### 2. Configure Domain (Optional)

If you have a domain:

```bash
# Update Nginx configuration
sudo nano /etc/nginx/sites-available/trade-copy
# Replace YOUR_DOMAIN_OR_IP with your actual domain

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Update environment variables
nano /home/ubuntu/trade-copy/.env.production
# Set NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Set Up Firewall

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw status
```

### 4. Create Backup Script

```bash
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/trade-copy-$DATE.tar.gz /home/ubuntu/trade-copy

# Backup trading platform data
tar -czf $BACKUP_DIR/trading-platforms-$DATE.tar.gz /home/ubuntu/trading-platforms

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /home/ubuntu/backup.sh" | crontab -
```

---

## ✅ **Testing & Verification**

### 1. Test Web Application

```bash
# Check application status
pm2 status
pm2 logs

# Test web interface
curl http://localhost:3000
curl http://YOUR_VPS_IP
```

### 2. Test VPS Management

```bash
# Test VPS manager
node /home/ubuntu/trade-copy/scripts/vps-manager.js

# Check system health
cat /home/ubuntu/trade-copy/logs/vps-monitor.log
```

### 3. Test Database Connection

```bash
# Check if app connects to Supabase
pm2 logs trade-copy-web --lines 50
```

### 4. Test Real-time Features

1. Open web dashboard
2. Check monitoring page (`/monitoring`)
3. Verify real-time metrics are updating

---

## 🐛 **Troubleshooting**

### Common Issues

**1. Application won't start:**
```bash
# Check logs
pm2 logs
# Check environment variables
cat .env.production
# Restart application
pm2 restart all
```

**2. Database connection issues:**
```bash
# Verify Supabase credentials
echo $NEXT_PUBLIC_SUPABASE_URL
# Test connection manually
curl -H "apikey: YOUR_ANON_KEY" $NEXT_PUBLIC_SUPABASE_URL/rest/v1/vps_instances
```

**3. Wine/MT4 issues:**
```bash
# Reinstall Wine
sudo apt remove --purge wine*
sudo apt autoremove
sudo apt install wine wine32 wine64
```

**4. Low memory issues (free VPS):**
```bash
# Create swap file
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**5. Performance optimization for free VPS:**
```bash
# Reduce PM2 instances
pm2 scale trade-copy-web 1

# Enable gzip compression in Nginx
sudo nano /etc/nginx/nginx.conf
# Uncomment gzip settings

# Restart services
sudo systemctl restart nginx
pm2 restart all
```

### Monitoring Commands

```bash
# System resources
htop
free -h
df -h

# Application status
pm2 monit
pm2 logs --lines 100

# Network status
netstat -tlnp
```

---

## 📊 **Performance Expectations on Free VPS**

### Oracle Cloud Free Tier:
- **Concurrent Users**: 10-20
- **Trade Processing**: 50-100 trades/minute
- **Response Time**: 200-500ms

### Google Cloud f1-micro:
- **Concurrent Users**: 5-10
- **Trade Processing**: 20-50 trades/minute  
- **Response Time**: 500-1000ms

### Optimization Tips:
1. Use PM2 cluster mode sparingly
2. Enable Nginx caching
3. Optimize database queries
4. Use CDN for static assets
5. Implement proper error handling

---

## 🎯 **Next Steps**

1. **Set up monitoring alerts**
2. **Implement backup strategies**
3. **Scale to multiple VPS when needed**
4. **Add custom domain and SSL**
5. **Implement advanced security measures**

**Your fully managed trade copier is now running on free VPS infrastructure! 🚀**

---

## 📞 **Support**

- **Documentation**: Check `/docs` folder
- **Logs**: `/home/ubuntu/trade-copy/logs/`
- **Monitoring**: `http://YOUR_VPS_IP/monitoring`

**Happy Trading! 📈**