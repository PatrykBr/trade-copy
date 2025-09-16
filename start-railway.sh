#!/bin/bash
# Railway deployment script for trade bridge

echo "🚂 Railway Trade Bridge Deployment"
echo "=================================="

# Ensure we're using the right Dockerfile
echo "📁 Using Dockerfile.trade-bridge"

# Show environment variables (without sensitive values)
echo "🔧 Environment Variables:"
echo "  - SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "  - PORT: $PORT"
echo "  - NODE_ENV: $NODE_ENV"

# Start the trade bridge service
echo "🚀 Starting Trade Bridge Service..."
exec npx ts-node src/services/trading/trade-bridge.ts