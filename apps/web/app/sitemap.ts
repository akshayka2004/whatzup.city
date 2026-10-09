import type { MetadataRoute } from 'next';
import { SITE_URL, serverGet } from '@/lib/server-api';
import { MOVIES_ENABLED } from '@/lib/feature-flags';

// Rebuilt at most once an hour; never fails the build if the API is unreachable.
export const revalidate = 3600;

const STATIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
}[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/search', priority: 0.9, changeFrequency: 'daily' },
  { path: '/offers', priority: 0.9, changeFrequency: 'daily' },
  { path: '/category', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/events', priority: 0.7, changeFrequency: 'daily' },
  { path: '/government', priority: 0.6, changeFrequency: 'daily' },
  ...(MOVIES_ENABLED
    ? [{ path: '/movies', priority: 0.6, changeFrequency: 'weekly' as const }]
    : []),
  { path: '/spin-it', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/support', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/terms-of-service', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.2, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Approved businesses, newest first; 100 per page, capped so a huge catalogue can't stall the build.
  for (let page = 1; page <= 30; page++) {
    const body = await serverGet<any>(`/v1/businesses?limit=100&page=${page}`, {
      revalidate: 3600,
      timeoutMs: 8000,
    });
    const list: any[] = body?.data ?? body?.items ?? (Array.isArray(body) ? body : []);
    if (!list.length) break;
    for (const b of list) {
      if (b?.status !== 'APPROVED' || !b?.id) continue;
      entries.push({
        url: `${SITE_URL}/business/${b.id}`,
        lastModified: b.updatedAt ? new Date(b.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    if (!body?.meta?.hasNext) break;
  }

  // Upcoming and current events (the public list only returns live ones).
  const events = await serverGet<any>('/v1/events', { revalidate: 3600, timeoutMs: 8000 });
  const evList: any[] = events?.data ?? events?.items ?? (Array.isArray(events) ? events : []);
  for (const e of evList) {
    if (!e?.id) continue;
    entries.push({
      url: `${SITE_URL}/events/${e.id}`,
      lastModified: e.updatedAt ? new Date(e.updatedAt) : now,
      changeFrequency: 'daily',
      priority: 0.6,
    });
  }

  return entries;
}
