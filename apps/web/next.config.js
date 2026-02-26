/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  transpilePackages: ['@gepanda/shared'],
  // Proxy API routes to the API server (do NOT add /api/auth - NextAuth must stay on this app)
  async rewrites() {
    return [
      { source: '/api/stream/:path*', destination: `${apiUrl}/api/stream/:path*` },
      { source: '/api/companion/:path*', destination: `${apiUrl}/api/companion/:path*` },
      { source: '/api/chat/:path*', destination: `${apiUrl}/api/chat/:path*` },
      { source: '/api/feed/:path*', destination: `${apiUrl}/api/feed/:path*` },
      { source: '/api/checkout/:path*', destination: `${apiUrl}/api/checkout/:path*` },
      { source: '/api/orders/:path*', destination: `${apiUrl}/api/orders/:path*` },
      { source: '/api/products/:path*', destination: `${apiUrl}/api/products/:path*` },
      { source: '/api/healthz', destination: `${apiUrl}/api/healthz` },
    ];
  },
};

module.exports = nextConfig;

