import type { Metadata } from 'next';
import { serverGet } from '@/lib/server-api';
import { EventsClient } from './events-client';

// Server-render the default (all cities) list and re-fetch it at most every 2 minutes.
// The client component fetches for itself when this is null or the viewer picks a city.
export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Events',
  description: 'Discover events near you in Kerala — register or grab tickets.',
};

export default async function EventsPage() {
  const initialEvents = await serverGet<unknown>('/v1/events?limit=100');
  return <EventsClient initialEvents={initialEvents} />;
}
