#!/bin/bash

echo "🔍 Checking TradeCopy Pro Environment Configuration"
echo "=================================================="

cd /home/ubuntu/trade-copy

echo "📁 Current directory: $(pwd)"
echo ""

echo "📋 Environment files present:"
ls -la .env* 2>/dev/null || echo "No .env files found"
echo ""

echo "🔧 Node.js version:"
node -v
echo ""

echo "📦 PM2 processes:"
pm2 list
echo ""

echo "🌐 Environment variables (sanitized):"
if [ -f .env.production ]; then
    echo "✅ .env.production exists"
    grep -E "^[A-Z_]+" .env.production | sed 's/=.*/=***HIDDEN***/' || echo "Could not read .env.production"
else
    echo "❌ .env.production missing"
fi

if [ -f .env.local ]; then
    echo "✅ .env.local exists"
    grep -E "^[A-Z_]+" .env.local | sed 's/=.*/=***HIDDEN***/' || echo "Could not read .env.local"
else
    echo "❌ .env.local missing"
fi

echo ""
echo "🔍 Checking Supabase connectivity:"
if command -v curl &> /dev/null; then
    # Check if we can reach Supabase
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.production 2>/dev/null; then
        SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.production | cut -d'=' -f2)
        echo "Testing connection to: ${SUPABASE_URL}"
        curl -s -I "${SUPABASE_URL}/rest/v1/" | head -1 || echo "Could not connect to Supabase"
    else
        echo "❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.production"
    fi
else
    echo "curl not available for testing"
fi

echo ""
echo "📊 Recent PM2 logs (last 10 lines):"
pm2 logs trade-copy-web --lines 10 --nostream 2>/dev/null || echo "Could not fetch PM2 logs"

echo ""
echo "🔍 Diagnosis complete!"