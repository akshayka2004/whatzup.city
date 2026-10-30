'use client';

import { useParams } from 'next/navigation';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { EventHostHub } from '@/components/events/host/host-hub';

export default function DashboardEventTicketsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <BusinessLayout>
      <EventHostHub eventId={id} backHref="/dashboard/events" />
    </BusinessLayout>
  );
}
