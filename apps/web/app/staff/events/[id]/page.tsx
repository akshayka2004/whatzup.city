'use client';

import { useParams } from 'next/navigation';
import { StaffLayout } from '@/components/layouts/staff-layout';
import { EventHostHub } from '@/components/events/host/host-hub';

export default function StaffEventTicketsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <StaffLayout>
      <EventHostHub eventId={id} backHref="/staff/events" />
    </StaffLayout>
  );
}
