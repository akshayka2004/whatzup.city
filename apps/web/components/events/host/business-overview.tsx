'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Loader2, MapPin, Search, Wallet } from 'lucide-react';
import { rupees } from '@saas/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import {
  SOURCE_LABEL,
  type BusinessEventRow,
  type BusinessOverview as Overview,
} from '@/lib/event-host';
import { cn } from '@/lib/utils';
import { MiniBars } from './mini-bars';
import { payments } from './payment-detail';

/** One read of a business's events, shared by the History and Analytics views. */
function useOverview(businessId: string | undefined) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!businessId) return;
    apiService
      .get<Overview>(`/v1/events/host/overview?businessId=${businessId}`, { fresh: true })
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data);
      });
  }, [businessId]);
  return { data, error };
}

const pct = (n: number | null) => (n == null ? '–' : `${n}%`);

function Loading({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : (
    <Loader2
      className="mx-auto my-16 size-6 animate-spin text-muted-foreground"
      aria-label="Loading"
    />
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn';
}) {
  return (
    <Card className={cn('gap-1 rounded-card p-4', tone === 'warn' && 'border-warning/40')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

// ── History: every event that is over (or was cancelled), newest first ─────────────────────────

export function BusinessEventsHistory({ businessId }: { businessId: string | undefined }) {
  const { data, error } = useOverview(businessId);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | 'PAID' | 'FREE'>('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.events ?? [])
      .filter((e) => e.ended || e.status !== 'ACTIVE')
      .filter((e) => (kind ? (kind === 'PAID') === e.isPaid : true))
      .filter((e) => !needle || e.title.toLowerCase().includes(needle))
      .sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate));
  }, [data, q, kind]);

  if (!data) return <Loading error={error} />;
  const t = data.totals;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t.held > 0
          ? `${t.held} ${t.held === 1 ? 'event' : 'events'} held, ${t.attended} ${t.attended === 1 ? 'person' : 'people'} came${t.verifiedRevenue > 0 ? `, ${rupees(t.verifiedRevenue)} paid to you` : ''}.`
          : 'Events you have finished will be listed here with how they went.'}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Ticket type" className="flex gap-1.5">
          {(
            [
              ['', 'All'],
              ['PAID', 'Paid'],
              ['FREE', 'Free'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k || 'all'}
              role="tab"
              type="button"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'min-h-9 cursor-pointer rounded-full border px-3 text-sm font-medium transition-colors',
                kind === k
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search past events"
            aria-label="Search past events"
            className="h-10 pl-9"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {data.events.length === 0
            ? 'No events yet.'
            : 'No past events match. Events appear here once they are over.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((e) => (
            <HistoryRow key={e.id} e={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({ e }: { e: BusinessEventRow }) {
  const cancelled = e.status !== 'ACTIVE';
  return (
    <li>
      <Link
        href={`/dashboard/events/${e.id}`}
        className="block rounded-card border border-border bg-card p-4 transition-colors hover:bg-muted/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{e.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden /> {fmtWhen(e.startDate)}
              </span>
              {e.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {e.city}
                </span>
              )}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              cancelled
                ? 'bg-danger-soft text-danger-soft-foreground'
                : e.isPaid
                  ? 'bg-brand-soft text-brand-soft-foreground'
                  : 'bg-success-soft text-success-soft-foreground',
            )}
          >
            {cancelled ? 'Cancelled' : e.isPaid ? 'Paid' : 'Free'}
          </span>
        </div>

        {e.takesRsvp ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Booked</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {e.confirmed}
                {e.capacity ? (
                  <span className="font-normal text-muted-foreground"> / {e.capacity}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Came</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {e.attended}
                <span className="font-normal text-muted-foreground"> ({pct(e.showRate)})</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">No-shows</dt>
              <dd className="font-semibold tabular-nums text-foreground">{e.noShows ?? '–'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {e.isPaid ? 'Paid to you' : 'Cancelled'}
              </dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {e.isPaid ? rupees(e.revenue) : e.cancelled}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            This event did not take RSVPs on Whtzup.city, so there are no ticket numbers.
          </p>
        )}
        {e.toVerify > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning-soft-foreground">
            <Wallet className="size-3.5" aria-hidden /> {e.toVerify}{' '}
            {e.toVerify === 1 ? 'payment' : 'payments'} still to verify ({rupees(e.awaiting)})
          </p>
        )}
      </Link>
    </li>
  );
}

// ── Analytics: the whole picture across events ───────────────────────────────────────────────

const MONTH = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' });

/** The last twelve calendar months ending now, so a quiet month shows as a gap and not a skip. */
function lastMonths(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      label: MONTH.format(m),
    });
  }
  return out;
}
const monthKey = (iso: string) => {
  const p = new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  return p.slice(0, 7);
};

export function BusinessEventsAnalytics({ businessId }: { businessId: string | undefined }) {
  const { data, error } = useOverview(businessId);

  const monthly = useMemo(() => {
    const months = lastMonths();
    const by = new Map(months.map((m) => [m.key, { events: 0, attended: 0, revenue: 0 }]));
    for (const e of data?.events ?? []) {
      if (e.status !== 'ACTIVE') continue;
      const m = by.get(monthKey(e.startDate));
      if (!m) continue;
      m.events += 1;
      m.attended += e.attended;
      m.revenue += e.revenue;
    }
    return months.map((m) => ({ ...m, ...by.get(m.key)! }));
  }, [data]);

  if (!data) return <Loading error={error} />;
  const t = data.totals;
  const best = [...data.events]
    .filter((e) => e.takesRsvp && e.attended > 0)
    .sort((a, b) => b.attended - a.attended)
    .slice(0, 5);
  const bestMax = Math.max(1, ...best.map((e) => e.attended));
  const totalSeats = data.sources.reduce((s, x) => s + x.seats, 0);

  if (t.events === 0) {
    return (
      <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Publish an event and turn on RSVP. The numbers will build up here.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Events held" value={String(t.held)} sub={`${t.upcoming} coming up`} />
        <Tile label="People booked" value={String(t.rsvps)} sub={`${t.cancelled} cancelled`} />
        <Tile
          label="People who came"
          value={String(t.attended)}
          sub={`${pct(t.showRate)} of those booked`}
        />
        <Tile label="Average fill" value={pct(t.avgFillRate)} sub="of seats, on finished events" />
        {t.paidEvents > 0 && (
          <>
            <Tile
              label="Paid to you (verified)"
              value={rupees(t.verifiedRevenue)}
              sub={`${t.paidEvents} paid ${t.paidEvents === 1 ? 'event' : 'events'}`}
            />
            <Tile
              label="Waiting for you to verify"
              value={rupees(t.awaitingRevenue)}
              sub={payments(t.toVerify)}
              tone={t.toVerify > 0 ? 'warn' : undefined}
            />
          </>
        )}
      </div>

      <Card className="rounded-card p-5">
        <h3 className="font-semibold text-foreground">People who came, by month</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Last 12 months, by the month the event took place.
        </p>
        <MiniBars
          label="People who attended events in each of the last twelve months"
          bars={monthly.map((m) => ({
            label: m.label,
            value: m.attended,
            title: `${m.label}: ${m.attended} attended across ${m.events} ${m.events === 1 ? 'event' : 'events'}`,
          }))}
          emptyText="No one has checked in at an event in the last year."
        />
      </Card>

      {t.paidEvents > 0 && (
        <Card className="rounded-card p-5">
          <h3 className="font-semibold text-foreground">Verified payments, by month (₹)</h3>
          <MiniBars
            label="Verified payments in each of the last twelve months"
            bars={monthly.map((m) => ({
              label: m.label,
              value: Math.round(m.revenue),
              title: `${m.label}: ${rupees(m.revenue)}`,
            }))}
            emptyText="No verified payments in the last year."
          />
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-card p-5">
          <h3 className="font-semibold text-foreground">Your best events</h3>
          {best.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Events with check-ins show up here.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {best.map((e) => (
                <li key={e.id}>
                  <Link href={`/dashboard/events/${e.id}`} className="block">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {e.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {e.attended} came
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(e.attended / bestMax) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-card p-5">
          <h3 className="font-semibold text-foreground">Where bookings came from</h3>
          {data.sources.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.sources.map((s) => (
                <li key={s.source}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">
                      {SOURCE_LABEL[s.source] ?? s.source}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.seats} ({Math.round((s.seats / Math.max(1, totalSeats)) * 100)}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(s.seats / Math.max(1, totalSeats)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Open any event for its own numbers: arrival times, gates, and who paid.
      </p>
    </div>
  );
}
