'use client';

import { useParams } from 'next/navigation';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { EventHostHub } from '@/components/events/host/host-hub';

export default function SuperAdminEventTicketsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <SuperAdminLayout>
      <EventHostHub eventId={id} backHref="/super-admin/events" />
    </SuperAdminLayout>
  );
}
