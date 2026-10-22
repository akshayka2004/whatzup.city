// Pin a stable Server Actions encryption key so action IDs stay constant across
// rebuilds. Without it, every `next build` mints new IDs and any browser tab left
// open from a prior deploy fails with "Failed to find Server Action". Prefer an
// env-provided key; fall back to a fixed constant (the app ships no sensitive
// server actions, so a static key is safe here).
process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||= 'whtzup-city-stable-server-actions-key-v1';

/** @type {import('next').NextConfig} */
// Content-Security-Policy. 'unsafe-inline' scripts are required by Next's inline
// bootstrap without per-request nonces (nonces would make every page dynamic and
// defeat ISR); everything else is pinned to our origin and the few hosts we use:
// Supabase Storage (images, signed uploads, PDF previews) and OpenFreeMap tiles.
const SUPABASE = 'https://*.supabase.co';
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE} https://tiles.openfreemap.org`,
  "worker-src 'self' blob:",
  `frame-src 'self' ${SUPABASE}`,
  `media-src 'self' blob: ${SUPABASE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

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

  // Long-lived caching for built static assets — production only. In dev,
  // Turbopack doesn't always change chunk filenames per edit, so a year-long
  // immutable cache here makes browsers keep serving stale JS/CSS across
  // restarts no matter how many times the source changes.
  async headers() {
    return [
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/_next/static/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
          ]
        : []),
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
          // Camera for the QR scanner and location for "Nearby"; nothing else.
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                { key: 'Content-Security-Policy', value: CSP },
              ]
            : []),
        ],
      },
    ];
  },

  // Payments are dormant: the plan, checkout, invoice and payment-admin screens are not reachable.
  async redirects() {
    if (process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true') return [];
    return [
      { source: '/dashboard/subscriptions', destination: '/dashboard', permanent: false },
      { source: '/dashboard/invoice/:id', destination: '/dashboard', permanent: false },
      { source: '/admin/payments', destination: '/admin', permanent: false },
      { source: '/admin/payment-approvals', destination: '/admin', permanent: false },
      { source: '/admin/subscriptions', destination: '/admin', permanent: false },
      { source: '/super-admin/subscriptions', destination: '/super-admin', permanent: false },
    ];
  },

  async rewrites() {
    // API_URL env var — set in PM2 ecosystem or shell env.
    // Bare-metal default: http://localhost:4001 (API and web share the VPS)
    const apiUrl =
      process.env.API_URL ||
      (process.env.NODE_ENV === 'production' ? 'http://localhost:4001' : 'http://localhost:4000');
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
