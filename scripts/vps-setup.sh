#!/bin/bash

# TradeCopy Pro - Automated VPS Setup Script
# For Oracle Cloud Free Tier Ubuntu 22.04

set -e  # Exit on any error

echo "🚀 Starting TradeCopy Pro VPS Setup..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "This script should be run as the ubuntu user"
    exit 1
fi

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing essential packages..."
sudo apt install -y curl wget git htop unzip vim build-essential software-properties-common

# Install Node.js 18
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js installed: $NODE_VERSION"
print_status "NPM installed: $NPM_VERSION"

# Install PM2 for process management
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
rm get-docker.sh

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Wine for MT4/MT5 support
print_status "Installing Wine for MT4/MT5 support..."
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install -y wine wine32 wine64 winetricks

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Create application directories
print_status "Creating application directories..."
mkdir -p /home/ubuntu/trade-copy
mkdir -p /home/ubuntu/trading-platforms/{mt4,mt5,monitoring}/{data,logs,config}
mkdir -p /home/ubuntu/backups
mkdir -p /home/ubuntu/logs

# Set up firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000

# Create swap file (important for 1GB RAM VPS)
print_status "Creating swap file for better performance..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize system for trading applications
print_status "Optimizing system settings..."
sudo tee -a /etc/sysctl.conf << EOF

# Optimizations for trading applications
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
vm.swappiness = 10
EOF

sudo sysctl -p

print_status "Basic VPS setup completed!"
print_status "Next: Run the application deployment script"

echo ""
echo "==================================="
echo -e "${GREEN}✅ VPS Setup Complete!${NC}"
echo "==================================="
echo "System Information:"
echo "- OS: $(lsb_release -d | cut -f2)"
echo "- Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "- Disk: $(df -h / | awk 'NR==2{printf "%.1fG available\n", $4/1}')"
echo "- Node.js: $(node --version)"
echo "- Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
echo ""
echo "Next steps:"
echo "1. Reboot to apply all changes: sudo reboot"
echo "2. After reboot, run the application deployment script"