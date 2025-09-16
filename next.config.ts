import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds for faster deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds for faster deployment  
    ignoreBuildErrors: true,
  },
  output: 'standalone',
};

export default nextConfig;
