import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['ws'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'ws'];
    return config;
  }
};

export default nextConfig;
