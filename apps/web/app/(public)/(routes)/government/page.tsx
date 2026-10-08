import type { Metadata } from 'next';
import { serverGet } from '@/lib/server-api';
import { GovernmentClient } from './government-client';

// Server-render the default (all cities) list and re-fetch it at most every 2 minutes.
// The client component fetches for itself when this is null or the viewer picks a city.
export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Government Announcements',
  description: 'Official notices and civic updates for Kerala.',
};

export default async function GovernmentPage() {
  const initialNotices = await serverGet<unknown>('/v1/announcements');
  return <GovernmentClient initialNotices={initialNotices} />;
}
