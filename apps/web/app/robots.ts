import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/server-api';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private, account and back-office areas have nothing worth indexing.
        disallow: ['/api/', '/dashboard', '/admin', '/super-admin', '/staff', '/profile', '/notifications', '/register', '/login', '/forgot-password', '/civic'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
