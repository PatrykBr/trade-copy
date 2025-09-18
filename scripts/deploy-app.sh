#!/bin/bash

# TradeCopy Pro - Application Deployment Script
# Run this after vps-setup.sh and reboot

set -e

echo "🚀 Deploying TradeCopy Pro Application..."
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "/home/ubuntu/trade-copy" ]; then
    print_error "Application directory not found. Run vps-setup.sh first."
    exit 1
fi

cd /home/ubuntu

# Clone the repository
print_status "Cloning TradeCopy Pro repository..."
if [ -d "trade-copy/.git" ]; then
    print_status "Repository already exists, pulling latest changes..."
    cd trade-copy
    git pull origin main
else
    git clone https://github.com/PatrykBr/trade-copy.git
    cd trade-copy
fi

# Install dependencies
print_status "Installing application dependencies..."
npm install

# Create environment file template
print_status "Creating environment configuration..."
cat > .env.production << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration (optional for testing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application Configuration
NEXT_PUBLIC_APP_URL=http://141.147.106.12
NODE_ENV=production
PORT=3000

# VPS Configuration
VPS_HOST=141.147.106.12
VPS_REGION=us-ashburn-1
VPS_CAPACITY=10
EOF

print_warning "IMPORTANT: Edit .env.production with your actual credentials!"
print_warning "Run: nano .env.production"

# Create PM2 ecosystem file
print_status "Creating PM2 process configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'trade-copy-web',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/trade-copy',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      error_file: '/home/ubuntu/logs/web-error.log',
      out_file: '/home/ubuntu/logs/web-out.log',
      log_file: '/home/ubuntu/logs/web-combined.log',
      time: true
    },
    {
      name: 'trade-copy-vps-manager',
      script: './scripts/vps-manager.js',
      cwd: '/home/ubuntu/trade-copy',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: '/home/ubuntu/logs/vps-error.log',
      out_file: '/home/ubuntu/logs/vps-out.log',
      log_file: '/home/ubuntu/logs/vps-combined.log',
      time: true
    }
  ]
};
EOF

# Create VPS manager script
print_status "Creating VPS management service..."
mkdir -p scripts
cat > scripts/vps-manager.js << 'EOF'
#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

class VPSManager {
  constructor() {
    this.platformPath = '/home/ubuntu/trading-platforms';
    this.instances = new Map();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.startHealthMonitoring();
  }

  async startHealthMonitoring() {
    console.log('🔧 Starting VPS health monitoring...');
    
    // Register this VPS instance in database
    await this.registerVPSInstance();
    
    // Start monitoring loop
    setInterval(async () => {
      await this.updateSystemHealth();
    }, 30000); // Update every 30 seconds
    
    console.log('✅ VPS health monitoring started');
  }

  async registerVPSInstance() {
    try {
      const vpsData = {
        name: 'oracle-free-main',
        host: process.env.VPS_HOST || '141.147.106.12',
        region: process.env.VPS_REGION || 'us-ashburn-1',
        capacity: parseInt(process.env.VPS_CAPACITY) || 10,
        status: 'active',
        platform_versions: {
          mt4: 'build 1380',
          mt5: 'build 3815',
          wine: '7.0'
        }
      };

      const { data, error } = await this.supabase
        .from('vps_instances')
        .upsert(vpsData, { onConflict: 'host' });

      if (error) {
        console.error('Failed to register VPS:', error);
      } else {
        console.log('✅ VPS instance registered in database');
      }
    } catch (error) {
      console.error('Error registering VPS:', error);
    }
  }

  async updateSystemHealth() {
    try {
      const health = await this.getSystemHealth();
      
      const { error } = await this.supabase
        .from('vps_instances')
        .update({
          cpu_usage: health.cpu,
          memory_usage: health.memory,
          disk_usage: health.disk,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('host', process.env.VPS_HOST || '141.147.106.12');

      if (error) {
        console.error('Failed to update health:', error);
      } else {
        console.log(`📊 Health updated - CPU: ${health.cpu}%, MEM: ${health.memory}%, DISK: ${health.disk}%`);
      }

      // Log health check
      await this.supabase
        .from('connection_health_logs')
        .insert({
          check_type: 'system_resources',
          status: health.status,
          response_time_ms: health.responseTime,
          details: health
        });

    } catch (error) {
      console.error('Error updating system health:', error);
    }
  }

  async getSystemHealth() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      exec(`
        echo "CPU:" && grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage "%"}'
        echo "MEM:" && free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}'
        echo "DISK:" && df -h / | awk 'NR==2{print $5}'
        echo "LOAD:" && uptime | awk -F'load average:' '{print $2}'
      `, (error, stdout, stderr) => {
        const lines = stdout.trim().split('\n');
        const responseTime = Date.now() - startTime;
        
        const cpuLine = lines.find(l => l.startsWith('CPU:'));
        const memLine = lines.find(l => l.startsWith('MEM:'));
        const diskLine = lines.find(l => l.startsWith('DISK:'));
        
        const cpu = parseFloat(cpuLine?.split('CPU:')[1] || '0');
        const memory = parseFloat(memLine?.split('MEM:')[1] || '0');
        const disk = parseFloat(diskLine?.split('DISK:')[1]?.replace('%', '') || '0');
        
        const status = cpu > 90 || memory > 90 ? 'critical' :
                      cpu > 80 || memory > 80 ? 'warning' : 'healthy';
        
        resolve({
          cpu: Math.round(cpu * 10) / 10,
          memory: Math.round(memory * 10) / 10,
          disk: Math.round(disk * 10) / 10,
          status,
          responseTime,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  async startMT4Instance(accountConfig) {
    const { accountId, login, password, server } = accountConfig;
    
    console.log(`🎯 Starting MT4 instance for account ${accountId}`);
    
    try {
      // Create MT4 configuration
      const configDir = `${this.platformPath}/mt4/config`;
      const configPath = `${configDir}/mt4_${accountId}.ini`;
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
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
      
      // For now, simulate MT4 connection
      console.log(`✅ MT4 configuration created for account ${accountId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to start MT4 for account ${accountId}:`, error);
      return false;
    }
  }
}

// Start VPS Manager
const manager = new VPSManager();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 VPS Manager shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 VPS Manager shutting down...');
  process.exit(0);
});

console.log('🚀 VPS Manager started');
EOF

chmod +x scripts/vps-manager.js

# Create monitoring script
print_status "Creating system monitoring script..."
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/home/ubuntu/logs/monitor.log"
APP_DIR="/home/ubuntu/trade-copy"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check if main application is running
    if ! pgrep -f "trade-copy-web" > /dev/null; then
        echo "$TIMESTAMP WARNING: Main application not running, restarting..." >> $LOG_FILE
        cd $APP_DIR && pm2 restart trade-copy-web
    fi
    
    # Check if VPS manager is running
    if ! pgrep -f "trade-copy-vps-manager" > /dev/null; then
        echo "$TIMESTAMP WARNING: VPS manager not running, restarting..." >> $LOG_FILE
        cd $APP_DIR && pm2 restart trade-copy-vps-manager
    fi
    
    # Log system status
    LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')
    MEM=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    echo "$TIMESTAMP System OK - Load: $LOAD, Memory: ${MEM}%" >> $LOG_FILE
    
    sleep 300 # Check every 5 minutes
done
EOF

chmod +x scripts/monitor.sh

# Create Nginx configuration
print_status "Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/trade-copy << EOF
server {
    listen 80;
    server_name 141.147.106.12;

    client_max_body_size 50M;

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
        proxy_read_timeout 86400;
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

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/trade-copy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    print_error "Nginx configuration has errors"
    exit 1
fi

# Create backup script
print_status "Creating backup script..."
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/trade-copy-$DATE.tar.gz /home/ubuntu/trade-copy --exclude=node_modules

# Backup trading platform data
tar -czf $BACKUP_DIR/trading-platforms-$DATE.tar.gz /home/ubuntu/trading-platforms

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup.sh

# Add backup to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup.sh") | crontab -

print_status "Application deployment completed!"

echo ""
echo "============================================="
echo -e "${GREEN}✅ TradeCopy Pro Deployed Successfully!${NC}"
echo "============================================="
echo ""
echo "📝 IMPORTANT NEXT STEPS:"
echo ""
echo "1. 🔧 Configure Environment Variables:"
echo "   nano /home/ubuntu/trade-copy/.env.production"
echo "   (Add your Supabase and Stripe credentials)"
echo ""
echo "2. 🏗️ Build and Start Application:"
echo "   cd /home/ubuntu/trade-copy"
echo "   npm run build"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. 🔍 Monitor Status:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo "4. 🌐 Access Your Application:"
echo "   http://141.147.106.12"
echo ""
echo "5. 📊 Monitoring Dashboard:"
echo "   http://141.147.106.12/monitoring"
echo ""
echo "============================================="
echo "🎯 Your VPS is ready for trading operations!"
echo "============================================="
EOF