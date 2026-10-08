import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MOVIES_ENABLED } from '@/lib/feature-flags';
import { serverGet } from '@/lib/server-api';
import { MoviesClient } from './movies-client';

// Server-render the default list (all cities, any status) and re-fetch it at most every 2 minutes.
// The client component fetches for itself when this is null or the viewer picks a city / status.
export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Movies',
  description: "What's showing and what's coming soon near you in Kerala.",
};

export default async function MoviesPage() {
  // Movies are dormant unless the feature flag is on (see lib/feature-flags).
  if (!MOVIES_ENABLED) notFound();
  const initialMovies = await serverGet<unknown>('/v1/movies');
  return <MoviesClient initialMovies={initialMovies} />;
}
