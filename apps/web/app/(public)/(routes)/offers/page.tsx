import { serverGet } from '@/lib/server-api';
import OffersClient from './offers-client';

// Re-render at most every 2 minutes: the offer list is public and identical for
// every visitor, so it is served as cached HTML and refreshed in the background.
export const revalidate = 120;

export default async function OffersPage() {
  // Same two endpoints the client page has always called for the default
  // (all cities) view. serverGet never throws — a null just means "let the
  // browser fetch it", which is exactly how this page worked before.
  const [offers, platformOffers] = await Promise.all([
    serverGet('/v1/offers', { revalidate: 120 }),
    serverGet('/v1/platform-offers/public', { revalidate: 120 }),
  ]);

  return <OffersClient initialOffers={offers} initialPlatformOffers={platformOffers} />;
}
