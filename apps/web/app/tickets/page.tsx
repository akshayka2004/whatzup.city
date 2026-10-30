'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MapPin,
  QrCode,
  Users,
  Wallet,
} from 'lucide-react';
import { rupees } from '@saas/types';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen, prettyCode, type PaymentCard, type TicketLite } from '@/lib/event-booking';
import { cn } from '@/lib/utils';

interface EventCard {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  status: string;
}
type Outcome = 'UPCOMING' | 'ATTENDED' | 'MISSED' | 'CANCELLED';
interface Row {
  event: EventCard;
  cancelDeadline: string;
  tickets: TicketLite[];
  payment: PaymentCard | null;
  outcome: Outcome;
}
interface Mine {
  items: Row[];
  waitlist: { event: EventCard; seats: number }[];
}

const OUTCOME: Record<Exclude<Outcome, 'UPCOMING'>, { label: string; tone: string }> = {
  ATTENDED: { label: 'You attended', tone: 'bg-success-soft text-success-soft-foreground' },
  MISSED: { label: 'You did not check in', tone: 'bg-muted text-muted-foreground' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-danger-soft text-danger-soft-foreground' },
};

type View = 'upcoming' | 'history';

export default function MyTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Mine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('upcoming');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    apiService.get<Mine>('/v1/tickets/mine', { fresh: true }).then((res) => {
      if (res.error) setError(res.error);
      else setData(res.data);
      setLoading(false);
    });
  }, [authLoading, user]);

  const { upcoming, history, attended } = useMemo(() => {
    const now = Date.now();
    const rows = data?.items ?? [];
    const isUpcoming = (r: Row) =>
      r.outcome !== 'CANCELLED' && new Date(r.event.endDate).getTime() >= now;
    return {
      upcoming: rows.filter(isUpcoming),
      // Newest first, so the last event someone went to is on top.
      history: rows
        .filter((r) => !isUpcoming(r))
        .sort((a, b) => +new Date(b.event.startDate) - +new Date(a.event.startDate)),
      attended: rows.filter((r) => r.outcome === 'ATTENDED').length,
    };
  }, [data]);

  const waiting = data?.waitlist ?? [];
  const empty = upcoming.length + history.length + waiting.length === 0;
  // Land on History when there is nothing coming up but there is a past.
  useEffect(() => {
    if (data && upcoming.length === 0 && waiting.length === 0 && history.length > 0)
      setView('history');
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PublicLayout>
      <PageHeader
        title="My tickets"
        description="Show the QR code at the gate. Each person has their own."
      />

      {authLoading || loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : !user ? (
        <EmptyState
          icon={QrCode}
          title="Sign in to see your tickets"
          description="Tickets are kept on your account, so you can open them at the door even on a new phone."
          action={{ label: 'Sign in', href: `/login?redirect=${encodeURIComponent('/tickets')}` }}
        />
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : empty ? (
        <EmptyState
          icon={QrCode}
          title="No tickets yet"
          description="RSVP to an event and its ticket will appear here."
          action={{ label: 'Find events', href: '/events' }}
        />
      ) : (
        <div className="space-y-6">
          <div
            role="tablist"
            aria-label="Tickets"
            className="flex gap-1 rounded-control bg-surface-sunken p-1 sm:w-fit"
          >
            {(
              [
                ['upcoming', 'Upcoming', upcoming.length + waiting.length],
                ['history', 'History', history.length],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cn(
                  'min-h-10 flex-1 cursor-pointer rounded-[10px] px-4 text-sm font-medium transition-colors sm:flex-none',
                  view === key
                    ? 'bg-card text-foreground shadow-e1'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                {n > 0 && <span className="ml-1.5 tabular-nums">{n}</span>}
              </button>
            ))}
          </div>

          {view === 'upcoming' ? (
            <div className="space-y-8">
              {upcoming.length > 0 ? (
                <Section title="Upcoming" rows={upcoming} />
              ) : (
                waiting.length === 0 && (
                  <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nothing coming up.{' '}
                    <Link href="/events" className="font-medium text-primary hover:underline">
                      Find events
                    </Link>
                  </p>
                )
              )}
              {waiting.length > 0 && (
                <section aria-labelledby="waiting">
                  <h2 id="waiting" className="mb-3 text-sm font-semibold text-foreground">
                    On the waitlist
                  </h2>
                  <ul className="space-y-2">
                    {waiting.map((w) => (
                      <li key={w.event.id}>
                        <Link
                          href={`/events/${w.event.id}`}
                          className="flex items-center gap-3 rounded-card border border-border bg-card p-4 hover:bg-muted/40"
                        >
                          <Users className="size-5 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{w.event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {fmtWhen(w.event.startDate)} · you get a seat if one opens
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="size-4" aria-hidden />
                {attended > 0
                  ? `You have been to ${attended} ${attended === 1 ? 'event' : 'events'} through Whtzup.city.`
                  : 'Events you have booked will be listed here once they are over.'}
              </p>
              <Section title="Past events" rows={history} muted />
            </div>
          ) : (
            <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Your past events will show up here.
            </p>
          )}
        </div>
      )}
    </PublicLayout>
  );
}

function Section({ title, rows, muted = false }: { title: string; rows: Row[]; muted?: boolean }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.event.id}>
            <div
              className={cn(
                'rounded-card border border-border bg-card p-4 shadow-e1',
                muted && r.outcome !== 'ATTENDED' && 'opacity-80',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`/events/${r.event.id}`}
                  className="inline-block py-2 font-semibold text-foreground hover:underline"
                >
                  {r.event.title}
                </Link>
                {r.outcome !== 'UPCOMING' && (
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      OUTCOME[r.outcome].tone,
                    )}
                  >
                    {OUTCOME[r.outcome].label}
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" aria-hidden />{' '}
                {fmtWhen(r.event.startDate)}
              </p>
              {(r.event.venue || r.event.city) && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  {[r.event.venue, r.event.city].filter(Boolean).join(', ')}
                </p>
              )}
              {r.event.status !== 'ACTIVE' && (
                <p className="mt-1 text-sm font-medium text-destructive">
                  This event was cancelled.
                </p>
              )}

              {r.payment && ['PENDING', 'SUBMITTED'].includes(r.payment.status) && (
                <Link
                  href={`/tickets/pay/${r.payment.id}`}
                  className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning-soft-foreground hover:brightness-95"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {r.payment.status === 'PENDING' ? (
                      <Wallet className="size-4" aria-hidden />
                    ) : (
                      <Clock className="size-4" aria-hidden />
                    )}
                    {r.payment.status === 'PENDING'
                      ? `Pay ${rupees(r.payment.amount)} to confirm your seat`
                      : 'Waiting for the host to verify your payment'}
                  </span>
                  <span className="text-xs font-semibold underline">
                    {r.payment.status === 'PENDING' ? 'Pay now' : 'View'}
                  </span>
                </Link>
              )}

              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {r.tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={
                        t.status === 'PENDING' && t.paymentId
                          ? `/tickets/pay/${t.paymentId}`
                          : `/tickets/${t.id}`
                      }
                      className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {t.holderName}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {prettyCode(t.code)}
                        </span>
                      </span>
                      {t.status === 'CHECKED_IN' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-soft-foreground">
                          <CheckCircle2 className="size-3" aria-hidden /> Checked in
                        </span>
                      ) : t.status === 'PENDING' ? (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                          Awaiting payment
                        </span>
                      ) : t.status === 'CANCELLED' ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          Cancelled
                        </span>
                      ) : (
                        <QrCode className="size-5 shrink-0 text-primary" aria-label="Show QR" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
