import { MOVIES_ENABLED } from '@/lib/feature-flags';
import { serverGet } from '@/lib/server-api';
import { HomeClient } from './home-client';

// ISR: the landing page is rendered with live data and refreshed every 2 minutes.
export const revalidate = 120;

/**
 * Server wrapper for the landing page. Everything is fetched in parallel and handed
 * to the client component as optional initial data; serverGet never throws and
 * returns null on failure, in which case HomeClient fetches in the browser exactly
 * as it always did. City-dependent data (events, movies, announcement) is fetched
 * city-less here and re-requested client-side once the viewer's city is known.
 */
export default async function HomePage() {
  const [categories, offers, businesses, events, movies, announcement] = await Promise.all([
    serverGet('/v1/categories'),
    serverGet('/v1/trending/offers?limit=8'),
    serverGet('/v1/trending/businesses?limit=8'),
    serverGet('/v1/events?limit=6'),
    MOVIES_ENABLED ? serverGet('/v1/movies?status=NOW_SHOWING&limit=6') : null,
    serverGet('/v1/announcements?limit=1'),
  ]);

  return (
    <HomeClient
      initialCategories={categories}
      initialOffers={offers}
      initialBusinesses={businesses}
      initialEvents={events}
      initialMovies={movies}
      initialAnnouncement={announcement}
    />
  );
}
