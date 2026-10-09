import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL, serverGet, unwrapOne } from '@/lib/server-api';
import { EventDetailClient } from './event-detail-client';

export const revalidate = 120;

const getEvent = cache(async (id: string): Promise<any | null> => {
  if (!id) return null;
  const body = await serverGet(`/v1/events/${encodeURIComponent(id)}`, { revalidate: 120 });
  const ev = unwrapOne<any>(body);
  return ev && typeof ev === 'object' && typeof ev.title === 'string' ? ev : null;
});

const trim = (t: string, max = 155) => {
  const c = (t || '').replace(/\s+/g, ' ').trim();
  return c.length <= max ? c : `${c.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ev = await getEvent(id);
  if (!ev) return { title: 'Event', robots: { index: false } };
  const where = [ev.venue, ev.city].filter(Boolean).join(', ');
  const description = trim(ev.description || `${ev.title}${where ? ` at ${where}` : ''}`);
  const url = `${SITE_URL}/events/${id}`;
  return {
    title: ev.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: ev.title,
      description,
      url,
      images: ev.posterImage ? [{ url: ev.posterImage }] : undefined,
    },
    twitter: {
      card: ev.posterImage ? 'summary_large_image' : 'summary',
      title: ev.title,
      description,
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = await getEvent(id);
  if (!ev) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev.title,
    description: trim(ev.description || '', 500),
    startDate: ev.startDate,
    endDate: ev.endDate || ev.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: ev.posterImage ? [ev.posterImage] : undefined,
    location:
      ev.venue || ev.city
        ? {
            '@type': 'Place',
            name: ev.venue || ev.city,
            address: {
              '@type': 'PostalAddress',
              addressLocality: ev.city,
              addressRegion: 'Kerala',
              addressCountry: 'IN',
            },
          }
        : undefined,
    organizer:
      ev.business?.name || ev.hostLabel
        ? { '@type': 'Organization', name: ev.business?.name || ev.hostLabel }
        : undefined,
    offers:
      ev.ticketType === 'PAID'
        ? {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: Number(ev.ticketPrice || 0),
            url: ev.ticketUrl || ev.registrationUrl || undefined,
          }
        : { '@type': 'Offer', priceCurrency: 'INR', price: 0 },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <EventDetailClient ev={ev} />
    </>
  );
}
