import { RSVP_SOURCES } from '@saas/types';
import { inferSource } from '@/lib/analytics/track';

/** Where this visit came from, in the words the host's analytics use. */
export function rsvpSource(): string {
  if (typeof window === 'undefined') return 'direct';
  const fromUrl = new URLSearchParams(window.location.search).get('src');
  if (fromUrl && (RSVP_SOURCES as readonly string[]).includes(fromUrl)) return fromUrl;
  const seen = inferSource();
  if (seen === 'external') return 'share';
  return (RSVP_SOURCES as readonly string[]).includes(seen) ? seen : 'direct';
}
