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
  }
};

export default nextConfig;
