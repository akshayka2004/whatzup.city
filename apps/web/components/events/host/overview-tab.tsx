'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ScanLine,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { apiService } from '@/lib/services/api-service';
import { fmtClock, fmtWhen } from '@/lib/event-booking';
import {
  SOURCE_LABEL,
  minutesLabel,
  type EventAnalytics,
  type HostSummary,
} from '@/lib/event-host';
import { MiniBars } from './mini-bars';

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${tone === 'ok' ? 'text-success-soft-foreground' : tone === 'warn' ? 'text-warning-soft-foreground' : 'text-foreground'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function OverviewTab({ eventId, summary }: { eventId: string; summary: HostSummary }) {
  const [data, setData] = useState<EventAnalytics | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await apiService.get<EventAnalytics>(`/v1/events/${eventId}/host/analytics`, {
      fresh: true,
    });
    if (res.error) setError(res.error);
    else {
      setError('');
      setData(res.data);
    }
  }, [eventId]);

  // Refresh every few seconds while the gate is open, so the host can watch people arrive.
  const gateOpen =
    data != null &&
    Date.now() >= new Date(data.event.checkInOpensAt).getTime() &&
    Date.now() <= new Date(data.event.checkInClosesAt).getTime();
  useEffect(() => {
    load();
    if (!gateOpen) return;
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 8000);
    return () => window.clearInterval(t);
  }, [load, gateOpen]);

  if (summary.bookingMode !== 'RSVP') {
    return (
      <Card className="rounded-card p-6 text-sm text-muted-foreground">
        RSVP is off for this event. Turn it on under Settings to take registrations and see
        analytics here.
      </Card>
    );
  }
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (!data)
    return (
      <Loader2
        className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
        aria-label="Loading"
      />
    );

  const t = data.totals;
  const a = data.arrivals;
  const maxSource = Math.max(1, ...data.sources.map((s) => s.seats));

  return (
    <div className="space-y-6">
      {gateOpen && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-2.5 text-sm font-medium text-success-soft-foreground">
          <Activity className="size-4" aria-hidden /> Gate is open. Numbers update every few
          seconds.
        </p>
      )}
      {data.event.venueCapacity != null && t.attended > data.event.venueCapacity && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger-soft-foreground"
        >
          <AlertTriangle className="size-4" aria-hidden /> More people are in ({t.attended}) than
          the venue limit ({data.event.venueCapacity}).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="RSVPs"
          value={t.seatsConfirmed}
          sub={
            t.fillRate != null
              ? `${t.fillRate}% of ${data.event.capacity} seats`
              : `${t.registrants} people registered`
          }
        />
        <Tile
          label="Attended"
          value={t.attended}
          tone="ok"
          sub={t.showRate != null ? `${t.showRate}% of RSVPs` : undefined}
        />
        <Tile
          label={data.event.ended ? 'No-shows' : 'Still expected'}
          value={data.event.ended ? (t.noShows ?? 0) : t.stillExpected}
          tone={data.event.ended && (t.noShows ?? 0) > 0 ? 'warn' : undefined}
        />
        <Tile
          label="Cancelled"
          value={t.cancelled}
          sub={t.waitlist ? `${t.waitlist} on the waitlist` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-card p-4">
          <h3 className="mb-1 text-sm font-semibold">RSVPs by day</h3>
          <p className="mb-2 text-xs text-muted-foreground">When people registered (IST).</p>
          <MiniBars
            label="RSVPs per day"
            bars={data.rsvpByDay.map((d) => ({
              label: d.day.slice(5),
              value: d.rsvps - d.cancelled,
              title: `${d.day}: ${d.rsvps} RSVPs, ${d.cancelled} cancelled`,
            }))}
            emptyText="No RSVPs yet."
          />
        </Card>

        <Card className="rounded-card p-4">
          <h3 className="mb-1 text-sm font-semibold">Arrivals</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            People checked in per {a.bucketMinutes} minutes, from the scan time.
          </p>
          <MiniBars
            label="Arrivals per 15 minutes"
            bars={a.curve.map((c) => ({
              label: c.slot.slice(11, 16),
              value: c.n,
              highlight: a.peak?.slot === c.slot,
              title: `${c.slot.slice(11, 16)}: ${c.n} people`,
            }))}
            emptyText="No one has checked in yet."
          />
          {a.peak && (
            <p className="mt-2 text-xs text-muted-foreground">
              Busiest: {a.peak.slot.slice(11, 16)} with {a.peak.n} people. Typical arrival{' '}
              {minutesLabel(a.medianMinutesBeforeStart)} the start (first{' '}
              {minutesLabel(a.firstArrivalMinutesBeforeStart)}, last{' '}
              {minutesLabel(a.lastArrivalMinutesBeforeStart)}).
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-card p-4 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ScanLine className="size-4 text-primary" aria-hidden /> Gates and crew
          </h3>
          {data.gates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No crew passes yet. Create them under Crew.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-1.5 font-medium">Pass</th>
                    <th className="py-1.5 text-right font-medium">Checked in</th>
                    <th className="py-1.5 text-right font-medium">First</th>
                    <th className="py-1.5 text-right font-medium">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gates.map((g) => (
                    <tr key={g.id} className="border-t border-border">
                      <td className="py-2">
                        {g.label}
                        {g.level === 'DESK' && (
                          <span className="ml-1.5 text-xs text-muted-foreground">desk</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">{g.checkedIn}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {fmtClock(g.first) || '–'}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {fmtClock(g.last) || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="rounded-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Scan quality</h3>
          <dl className="space-y-1.5 text-sm">
            <Row
              icon={<CheckCircle2 className="size-4 text-success-soft-foreground" />}
              k="Admitted"
              v={data.scans.valid}
            />
            <Row k="Checked in by hand" v={data.scans.manual} />
            <Row
              k="Already used (duplicates)"
              v={data.scans.duplicates}
              warn={data.scans.duplicates > 0}
            />
            <Row k="Invalid or wrong event" v={data.scans.invalid} warn={data.scans.invalid > 0} />
            <Row k="Cancelled tickets shown" v={data.scans.cancelledTickets} />
            <Row k="Undone" v={data.scans.undone} />
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Where RSVPs came from</h3>
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RSVPs yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.sources.map((s) => (
                <li key={s.source} className="text-sm">
                  <div className="flex justify-between">
                    <span>{SOURCE_LABEL[s.source] ?? s.source}</span>
                    <span className="tabular-nums text-muted-foreground">{s.seats}</span>
                  </div>
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${(s.seats / maxSource) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-primary" aria-hidden /> Audience
          </h3>
          <dl className="space-y-1.5 text-sm">
            <Row k="People who registered" v={t.registrants} />
            <Row k="First event on the platform for them" v={t.firstTimeOnPlatformEvents} />
            <Row k="Waitlist" v={t.waitlist} />
          </dl>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> Check-in {fmtWhen(data.event.checkInOpensAt)}{' '}
            to {fmtWhen(data.event.checkInClosesAt)}.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  warn = false,
  icon,
}: {
  k: string;
  v: number;
  warn?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {k}
      </dt>
      <dd
        className={`font-semibold tabular-nums ${warn ? 'text-warning-soft-foreground' : 'text-foreground'}`}
      >
        {v}
      </dd>
    </div>
  );
}
