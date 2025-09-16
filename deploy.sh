#!/bin/bash

# Production deployment script for TradeCopy Pro
set -e

echo "🚀 Starting TradeCopy Pro deployment..."

# Environment setup
export NODE_ENV=production
export COMPOSE_PROJECT_NAME=tradecopypro

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        print_status "Creating template .env.production file..."
        cat > .env.production << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
STRIPE_SECRET_KEY=sk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Domain Configuration
DOMAIN=tradecopypro.com
EMAIL=admin@tradecopypro.com
EOF
        print_warning "Please edit .env.production with your actual values before running again"
        exit 1
    fi
    
    print_status "Prerequisites check passed ✓"
}

# Create monitoring configuration
setup_monitoring() {
    print_status "Setting up monitoring configuration..."
    
    mkdir -p monitoring/grafana/provisioning/{dashboards,datasources}
    
    # Prometheus configuration
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'trade-bridge'
    static_configs:
      - targets: ['trade-bridge:8080']
    metrics_path: '/metrics'

  - job_name: 'web-app'
    static_configs:
      - targets: ['web:3000']
    metrics_path: '/api/metrics'

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

    # Grafana datasource
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
EOF

    # Loki configuration
    cat > monitoring/loki.yml << EOF
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s
EOF

    # Promtail configuration
    cat > monitoring/promtail.yml << EOF
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log

    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|](?!_))+)
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output
EOF

    print_status "Monitoring configuration created ✓"
}

# Database migration
run_migrations() {
    print_status "Running database migrations..."
    
    docker-compose --env-file .env.production run --rm migrate
    
    print_status "Database migrations completed ✓"
}

# Build and deploy services
deploy_services() {
    print_status "Building and deploying services..."
    
    # Copy production config
    cp next.config.production.ts next.config.ts
    
    # Build and start services
    docker-compose --env-file .env.production build --no-cache
    docker-compose --env-file .env.production up -d
    
    print_status "Services deployed ✓"
}

# Health checks
verify_deployment() {
    print_status "Verifying deployment..."
    
    sleep 30 # Wait for services to start
    
    # Check web app
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "Web app is healthy ✓"
    else
        print_error "Web app health check failed"
        exit 1
    fi
    
    # Check trade bridge
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_status "Trade bridge is healthy ✓"
    else
        print_error "Trade bridge health check failed"
        exit 1
    fi
    
    # Check Redis
    if docker-compose --env-file .env.production exec redis redis-cli ping | grep -q PONG; then
        print_status "Redis is healthy ✓"
    else
        print_error "Redis health check failed"
        exit 1
    fi
    
    print_status "All health checks passed ✓"
}

# SSL Certificate setup
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    # Create SSL directory
    mkdir -p ssl
    
    # Generate self-signed certificates for development
    if [ ! -f "ssl/cert.pem" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=TradeCopy/CN=tradecopypro.com"
        print_status "Self-signed certificates generated ✓"
    fi
}

# Backup system
create_backup() {
    print_status "Creating backup..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup Redis data
    docker-compose --env-file .env.production exec redis redis-cli BGSAVE
    docker cp "$(docker-compose --env-file .env.production ps -q redis)":/data/dump.rdb "$BACKUP_DIR/"
    
    # Backup environment files
    cp .env.production "$BACKUP_DIR/"
    
    print_status "Backup created in $BACKUP_DIR ✓"
}

# Performance optimization
optimize_performance() {
    print_status "Applying performance optimizations..."
    
    # Set kernel parameters for high-performance networking
    echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
    echo 'net.ipv4.tcp_max_syn_backlog = 65535' >> /etc/sysctl.conf
    echo 'net.core.netdev_max_backlog = 5000' >> /etc/sysctl.conf
    
    # Apply settings
    sysctl -p
    
    print_status "Performance optimizations applied ✓"
}

# Security hardening
apply_security() {
    print_status "Applying security configurations..."
    
    # Set up fail2ban for SSH protection
    if command -v fail2ban-client &> /dev/null; then
        systemctl enable fail2ban
        systemctl start fail2ban
        print_status "Fail2ban configured ✓"
    fi
    
    # Configure firewall
    if command -v ufw &> /dev/null; then
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow ssh
        ufw allow 80
        ufw allow 443
        ufw allow 8080
        ufw --force enable
        print_status "Firewall configured ✓"
    fi
    
    print_status "Security configurations applied ✓"
}

# Main deployment process
main() {
    print_status "Starting TradeCopy Pro production deployment..."
    
    check_prerequisites
    setup_monitoring
    setup_ssl
    create_backup
    run_migrations
    deploy_services
    verify_deployment
    
    print_status "🎉 Deployment completed successfully!"
    print_status ""
    print_status "Services are running at:"
    print_status "  • Web App: https://app.tradecopypro.com"
    print_status "  • Trade Bridge: wss://bridge.tradecopypro.com"
    print_status "  • Monitoring: https://monitoring.tradecopypro.com"
    print_status "  • Traefik Dashboard: https://traefik.tradecopypro.com"
    print_status ""
    print_status "Useful commands:"
    print_status "  • View logs: docker-compose --env-file .env.production logs -f"
    print_status "  • Scale services: docker-compose --env-file .env.production up -d --scale trade-bridge=3"
    print_status "  • Stop services: docker-compose --env-file .env.production down"
    print_status "  • Update services: ./deploy.sh"
}

# Run deployment
main "$@"