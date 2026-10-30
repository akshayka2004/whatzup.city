'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Loader2, MapPin, QrCode, Users } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen, prettyCode, type TicketLite } from '@/lib/event-booking';

interface EventCard {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  status: string;
}
interface Row {
  event: EventCard;
  cancelDeadline: string;
  tickets: TicketLite[];
}
interface Mine {
  items: Row[];
  waitlist: { event: EventCard; seats: number }[];
}

export default function MyTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Mine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const now = Date.now();
  const upcoming = (data?.items ?? []).filter((r) => new Date(r.event.endDate).getTime() >= now);
  const past = (data?.items ?? [])
    .filter((r) => new Date(r.event.endDate).getTime() < now)
    .reverse();

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
      ) : upcoming.length + past.length + (data?.waitlist.length ?? 0) === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No tickets yet"
          description="RSVP to an event and its ticket will appear here."
          action={{ label: 'Find events', href: '/events' }}
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && <Section title="Upcoming" rows={upcoming} />}
          {data && data.waitlist.length > 0 && (
            <section aria-labelledby="waiting">
              <h2 id="waiting" className="mb-3 text-sm font-semibold text-foreground">
                On the waitlist
              </h2>
              <ul className="space-y-2">
                {data.waitlist.map((w) => (
                  <li key={w.event.id}>
                    <Link
                      href={`/events/${w.event.id}`}
                      className="flex items-center gap-3 rounded-card border border-border bg-card p-4 hover:bg-muted/40"
                    >
                      <Users className="size-5 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{w.event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmtWhen(w.event.startDate)} · you get a ticket if a seat opens
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && <Section title="Past events" rows={past} muted />}
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
          <li key={r.event.id} className={muted ? 'opacity-70' : undefined}>
            <div className="rounded-card border border-border bg-card p-4 shadow-e1">
              <Link
                href={`/events/${r.event.id}`}
                className="font-semibold text-foreground hover:underline"
              >
                {r.event.title}
              </Link>
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
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {r.tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tickets/${t.id}`}
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
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-soft-foreground">
                          Checked in
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
