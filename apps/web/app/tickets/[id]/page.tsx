'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { CalendarDays, CheckCircle2, Loader2, MapPin, Sun } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { AddToCalendarButton } from '@/components/public/media/event-actions';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { fmtClock, fmtWhen, prettyCode } from '@/lib/event-booking';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  useEffect(() => {
    if (!ticket?.qr || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, ticket.qr, {
      width: 288,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#FFFFFF' },
    }).catch(() => undefined);
  }, [ticket]);

  const where = ticket ? [ticket.event.venue, ticket.event.city].filter(Boolean).join(', ') : '';
  const used = ticket?.status === 'CHECKED_IN';
  const cancelled =
    ticket?.status === 'CANCELLED' || (!!ticket && ticket.event.status !== 'ACTIVE');

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
          <div className="overflow-hidden rounded-sheet border border-border bg-card shadow-e2">
            <div className="bg-primary px-5 py-4 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {ticket.isGuest ? 'Guest ticket' : 'Ticket'}
              </p>
              <h1 className="mt-0.5 text-lg font-bold leading-snug">{ticket.event.title}</h1>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex justify-center">
                {cancelled ? (
                  <div className="flex size-72 max-w-full items-center justify-center rounded-xl bg-muted p-6 text-center text-sm font-medium text-muted-foreground">
                    {ticket.event.status !== 'ACTIVE'
                      ? 'This event was cancelled.'
                      : 'This ticket was cancelled.'}
                  </div>
                ) : ticket.status === 'PENDING' ? (
                  <div className="flex size-72 max-w-full flex-col items-center justify-center gap-3 rounded-xl bg-warning-soft p-6 text-center text-sm font-medium text-warning-soft-foreground">
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
                  </div>
                ) : (
                  <div className={`relative rounded-xl bg-white p-1 ${used ? 'opacity-30' : ''}`}>
                    <canvas
                      ref={canvasRef}
                      className="size-72 max-w-full"
                      aria-label="Ticket QR code"
                    />
                    {used && (
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-black">
                        USED
                      </span>
                    )}
                  </div>
                )}
              </div>

              {used && (
                <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-success-soft-foreground">
                  <CheckCircle2 className="size-4" aria-hidden /> Checked in at{' '}
                  {fmtClock(ticket.checkedInAt)}
                </p>
              )}

              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{ticket.holderName}</p>
                <p
                  className="mt-1 font-mono text-lg tracking-widest text-foreground"
                  aria-label="Ticket code"
                >
                  {prettyCode(ticket.code)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  If the QR will not scan, read this code to the crew.
                </p>
              </div>

              <dl className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <dd className="font-medium">{fmtWhen(ticket.event.startDate)}</dd>
                </div>
                {where && (
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <dd>
                      <span className="font-medium">{where}</span>{' '}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Directions
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {(ticket.event.bookingNote || ticket.event.minAge != null) && (
                <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                  {ticket.event.minAge != null && (
                    <p>Minimum age {ticket.event.minAge}. Carry an ID.</p>
                  )}
                  {ticket.event.bookingNote && (
                    <p className="whitespace-pre-line">{ticket.event.bookingNote}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <AddToCalendarButton event={{ ...ticket.event, id: ticket.event.id }} />
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/events/${ticket.event.id}`}>Event page</Link>
            </Button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sun className="size-3.5" aria-hidden /> Turn your screen brightness up at the gate.
          </p>
          <p className="text-center text-sm">
            <Link href="/tickets" className="text-primary hover:underline">
              All my tickets
            </Link>
          </p>
        </div>
      )}
    </PublicLayout>
  );
}
