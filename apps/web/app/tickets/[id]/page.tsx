'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, Sun } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { AddToCalendarButton } from '@/components/public/media/event-actions';
import { BoardingPass, type PassState } from '@/components/tickets/boarding-pass';
import { SavePass, ThemePicker, usePassTheme } from '@/components/tickets/pass-actions';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';

interface TicketDetail {
  id: string;
  code: string;
  holderName: string;
  isGuest: boolean;
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'PENDING';
  checkedInAt: string | null;
  qr: string | null;
  paymentId?: string | null;
  payment?: { id: string; status: string } | null;
  event: {
    id: string;
    title: string;
    venue: string | null;
    city: string | null;
    startDate: string;
    endDate: string;
    status: string;
    bookingNote?: string | null;
    minAge?: number | null;
  };
}

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = usePassTheme();
  const passRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return setLoading(false);
    apiService.get<TicketDetail>(`/v1/tickets/${id}`, { fresh: true }).then((res) => {
      if (res.error) setError(res.error);
      else setTicket(res.data);
      setLoading(false);
    });
  }, [authLoading, user, id]);

  // A QR is read best on a bright screen, and phones dim while someone waits in a queue.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as any).wakeLock
      ?.request('screen')
      .then((l: any) => (lock = l))
      .catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, []);

  const eventOff = !!ticket && ticket.event.status !== 'ACTIVE';
  const state: PassState = !ticket
    ? 'VALID'
    : ticket.status === 'CANCELLED' || eventOff
      ? 'CANCELLED'
      : ticket.status === 'PENDING'
        ? 'PENDING'
        : ticket.status === 'CHECKED_IN'
          ? 'USED'
          : 'VALID';

  const notes = ticket
    ? [
        ticket.event.minAge != null ? `Minimum age ${ticket.event.minAge}. Carry an ID.` : '',
        ticket.event.bookingNote ?? '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <PublicLayout>
      {authLoading || loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : !user ? (
        <EmptyState
          title="Sign in to see this ticket"
          action={{ label: 'Sign in', href: `/login?redirect=${encodeURIComponent('/tickets')}` }}
        />
      ) : error || !ticket ? (
        <EmptyState
          title="We couldn't find that ticket"
          description="It may belong to another account."
          action={{ label: 'My tickets', href: '/tickets' }}
        />
      ) : (
        <div className="mx-auto max-w-sm space-y-4">
          <BoardingPass
            ref={passRef}
            theme={theme}
            state={state}
            data={{
              title: ticket.event.title,
              startDate: ticket.event.startDate,
              endDate: ticket.event.endDate,
              venue: ticket.event.venue,
              city: ticket.event.city,
              holderName: ticket.holderName,
              code: ticket.code,
              isGuest: ticket.isGuest,
              qr: ticket.qr,
              checkedInAt: ticket.checkedInAt,
              note:
                state === 'CANCELLED'
                  ? eventOff
                    ? 'This event was cancelled.'
                    : 'This ticket was cancelled.'
                  : notes || null,
            }}
            pendingSlot={
              <>
                <p>
                  {ticket.payment?.status === 'SUBMITTED'
                    ? 'Waiting for the host to verify your payment. The QR appears here once it is approved.'
                    : 'This seat is held for you. Pay the host to get your QR.'}
                </p>
                {ticket.paymentId && (
                  <Button asChild size="sm">
                    <Link href={`/tickets/pay/${ticket.paymentId}`}>
                      {ticket.payment?.status === 'SUBMITTED' ? 'View payment' : 'Pay now'}
                    </Link>
                  </Button>
                )}
              </>
            }
          />

          <ThemePicker value={theme} onChange={setTheme} />
          {(state === 'VALID' || state === 'USED') && (
            <SavePass target={passRef} fileName={`whtzup-pass-${ticket.code}`} />
          )}
          <div className="flex gap-2">
            <AddToCalendarButton event={{ ...ticket.event, id: ticket.event.id }} />
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/events/${ticket.event.id}`}>Event page</Link>
            </Button>
          </div>
          {ticket.event.venue || ticket.event.city ? (
            <p className="text-center text-sm">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [ticket.event.venue, ticket.event.city].filter(Boolean).join(', '),
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center text-primary hover:underline"
              >
                Directions to the venue
              </a>
            </p>
          ) : null}
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sun className="size-3.5" aria-hidden /> Turn your screen brightness up at the gate.
          </p>
          <p className="text-center text-sm">
            <Link
              href="/tickets"
              className="inline-flex min-h-10 items-center text-primary hover:underline"
            >
              All my tickets
            </Link>
          </p>
        </div>
      )}
    </PublicLayout>
  );
}
