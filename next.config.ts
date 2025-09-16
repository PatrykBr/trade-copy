import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during build for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow deployment with TypeScript warnings
    ignoreBuildErrors: true,
  },
  env: {
    BRIDGE_SERVICE_URL: process.env.BRIDGE_SERVICE_URL || 'ws://localhost:3001'
  },
  // Ensure API routes are not statically analyzed during build
  output: 'standalone'
};

export default nextConfig;
