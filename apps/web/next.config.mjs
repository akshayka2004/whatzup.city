// Pin a stable Server Actions encryption key so action IDs stay constant across
// rebuilds. Without it, every `next build` mints new IDs and any browser tab left
// open from a prior deploy fails with "Failed to find Server Action". Prefer an
// env-provided key; fall back to a fixed constant (the app ships no sensitive
// server actions, so a static key is safe here).
process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||=
  'whtzup-city-stable-server-actions-key-v1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  transpilePackages: ['@saas/ui', '@saas/auth', '@saas/types', '@saas/database'],

  // Image optimisation — local + Supabase storage
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Optimise package imports — smaller client bundles for big icon / UI libs
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      'recharts',
      'date-fns',
    ],
  },

  // Long-lived caching for built static assets
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2|ttf)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // Default security headers
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  async rewrites() {
    // API_URL env var — set in PM2 ecosystem or shell env.
    // Bare-metal default: http://localhost:4001 (API and web share the VPS)
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
