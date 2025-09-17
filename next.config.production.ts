// Next.js configuration for production deployment
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Enable experimental features
  experimental: {
    serverComponentsExternalPackages: ['ioredis', 'ws']
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // Rewrites for API endpoints
  async rewrites() {
    return [
      {
        source: '/bridge/:path*',
        destination: 'http://trade-bridge:8080/:path*',
      },
    ];
  },
  
  // WebSocket support
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;