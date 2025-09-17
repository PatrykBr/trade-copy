#!/bin/bash

# Railway build script
echo "🔨 Building Trade Bridge for Railway..."

# Compile TypeScript
npx tsc trade-bridge-standalone.ts --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck

echo "✅ Build complete!"