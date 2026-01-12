/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // For Vercel deployment
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Transpile the shared package for Next.js
  transpilePackages: ['@gepanda/shared'],
};

module.exports = nextConfig;

