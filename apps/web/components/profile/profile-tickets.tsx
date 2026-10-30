'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, ChevronRight, QrCode, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen, type PaymentCard } from '@/lib/event-booking';

interface Row {
  event: { id: string; title: string; startDate: string; endDate: string };
  outcome: 'UPCOMING' | 'ATTENDED' | 'MISSED' | 'CANCELLED';
  payment: PaymentCard | null;
}

/**
 * Profile summary of the person's event tickets: what is coming, what they owe, and how many events
 * they have been to. The full list and history are on the Tickets page.
 */
export function ProfileTickets() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    apiService.get<{ items: Row[] }>('/v1/tickets/mine', { fresh: true }).then((res) => {
      setRows(res.error ? [] : (res.data?.items ?? []));
    });
  }, []);

  if (!rows) return null;
  const now = Date.now();
  const upcoming = rows
    .filter((r) => r.outcome !== 'CANCELLED' && new Date(r.event.endDate).getTime() >= now)
    .sort((a, b) => +new Date(a.event.startDate) - +new Date(b.event.startDate));
  const attended = rows.filter((r) => r.outcome === 'ATTENDED').length;
  const toPay = rows.filter((r) => r.payment?.status === 'PENDING');
  const next = upcoming[0];

  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <QrCode className="size-5 text-primary" aria-hidden /> My tickets
        </h2>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
        >
          View all <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No tickets yet.{' '}
          <Link href="/events" className="font-medium text-primary hover:underline">
            Find events
          </Link>
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-muted/40 p-3">
              <dd className="text-2xl font-bold tabular-nums text-foreground">{upcoming.length}</dd>
              <dt className="text-xs text-muted-foreground">Upcoming</dt>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <dd className="text-2xl font-bold tabular-nums text-foreground">{attended}</dd>
              <dt className="text-xs text-muted-foreground">Attended</dt>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <dd className="text-2xl font-bold tabular-nums text-foreground">{toPay.length}</dd>
              <dt className="text-xs text-muted-foreground">To pay</dt>
            </div>
          </dl>

          {toPay[0]?.payment && (
            <Link
              href={`/tickets/pay/${toPay[0].payment.id}`}
              className="mt-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm font-medium text-warning-soft-foreground hover:brightness-95"
            >
              <Wallet className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">Finish paying for {toPay[0].event.title}</span>
            </Link>
          )}

          {next && (
            <Link
              href="/tickets"
              className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">
                Next: <span className="font-medium text-foreground">{next.event.title}</span> ·{' '}
                {fmtWhen(next.event.startDate)}
              </span>
            </Link>
          )}
          {attended > 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              <Link href="/tickets" className="hover:text-foreground">
                See the events you attended in History
              </Link>
            </p>
          )}
        </>
      )}
    </Card>
  );
}
