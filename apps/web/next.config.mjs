/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@saas/ui', '@saas/auth', '@saas/types', '@saas/database'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async rewrites() {
    // API_URL env var — set in PM2 ecosystem or shell env.
    // Docker default: http://api:4000 | Bare-metal default: http://localhost:4001
    const apiUrl =
      process.env.API_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'http://localhost:4001'
        : 'http://localhost:4000');
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
