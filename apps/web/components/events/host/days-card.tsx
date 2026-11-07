'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { rupees } from '@saas/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useConfirm } from '@/components/common/confirm-dialog';
import { apiService } from '@/lib/services/api-service';
import { fmtDayRange, fromIstInput, toIstInput } from '@/lib/event-booking';
import type { HostSummary } from '@/lib/event-host';

interface DayRow {
  id: string;
  dayDate: string;
  label: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  seatsTaken: number;
  checkedInCount: number;
  price: number | null;
  isOpen: boolean;
  rsvpOpensAt: string | null;
  rsvpClosesAt: string | null;
  tickets: number;
  waiting: number;
  state: string;
}
interface DaysData {
  dayBooking: boolean;
  allDaysPrice: number | null;
  isPaidEvent: boolean;
  ticketPrice: number | null;
  canEnable: boolean;
  cannotEnableReason: string | null;
  days: DayRow[];
}

/** "HH:mm" in India time from an ISO moment. */
const istTime = (iso: string) => toIstInput(iso).slice(11, 16);
/** The ISO moment for a date (YYYY-MM-DD) and an "HH:mm" in India time. */
const fromDayTime = (day: string, time: string) => fromIstInput(`${day}T${time}`);
const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

type Draft = {
  id: string;
  dayDate: string;
  label: string;
  start: string;
  end: string;
  capacity: string;
  price: string;
  isOpen: boolean;
  opens: string;
  closes: string;
  seatsTaken: number;
  checkedInCount: number;
  waiting: number;
  tickets: number;
};

const toDraft = (d: DayRow): Draft => ({
  id: d.id,
  dayDate: d.dayDate,
  label: d.label,
  start: istTime(d.startsAt),
  end: istTime(d.endsAt),
  capacity: d.capacity?.toString() ?? '',
  price: d.price?.toString() ?? '',
  isOpen: d.isOpen,
  opens: toIstInput(d.rsvpOpensAt),
  closes: toIstInput(d.rsvpClosesAt),
  seatsTaken: d.seatsTaken,
  checkedInCount: d.checkedInCount,
  waiting: d.waiting,
  tickets: d.tickets,
});

/**
 * Host: sell each day of a multi-day event on its own. Turned on before the first booking. Each day
 * has its own name, hours, seats, price and booking window, and can be closed on its own.
 */
export function DaysCard({
  eventId,
  onChanged,
}: {
  eventId: string;
  onChanged: (s: HostSummary) => void;
}) {
  const confirm = useConfirm();
  const [data, setData] = useState<DaysData | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [bundle, setBundle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const apply = useCallback((d: DaysData) => {
    setData(d);
    setDrafts(d.days.map(toDraft));
    setBundle(d.allDaysPrice?.toString() ?? '');
  }, []);

  useEffect(() => {
    let alive = true;
    apiService.get<DaysData>(`/v1/events/${eventId}/host/days`, { fresh: true }).then((res) => {
      if (!alive) return;
      if (res.error || !res.data) setError(res.error || 'Could not load the days.');
      else apply(res.data);
    });
    return () => {
      alive = false;
    };
  }, [eventId, apply]);

  const refreshSummary = async () => {
    const res = await apiService.get<HostSummary>(`/v1/events/${eventId}/host`, { fresh: true });
    if (!res.error && res.data) onChanged(res.data);
  };

  const send = async (body: unknown, ok: string) => {
    setBusy(true);
    setError('');
    const res = await apiService.put<DaysData>(`/v1/events/${eventId}/host/days`, body);
    setBusy(false);
    if (res.error || !res.data) {
      setError(res.error || 'Could not save.');
      return false;
    }
    apply(res.data);
    toast.success(ok);
    await refreshSummary();
    return true;
  };

  const turnOn = () => send({ dayBooking: true }, 'Booking by day is on. Set each day below.');

  const turnOff = async () => {
    const yes = await confirm({
      title: 'Turn off booking by day?',
      description: 'The days are removed and people book the whole event again.',
      confirmLabel: 'Turn off',
      tone: 'danger',
    });
    if (yes) await send({ dayBooking: false }, 'Booking by day is off.');
  };

  const save = async () => {
    if (!data) return;
    for (const d of drafts) {
      if (!d.label.trim()) return setError('Give every day a name.');
      if (!d.start || !d.end || d.end <= d.start)
        return setError(`${d.label}: the day must end after it starts.`);
    }
    await send(
      {
        allDaysPrice: num(bundle),
        days: drafts.map((d) => ({
          id: d.id,
          label: d.label.trim(),
          startsAt: fromDayTime(d.dayDate, d.start),
          endsAt: fromDayTime(d.dayDate, d.end),
          capacity: num(d.capacity),
          price: num(d.price),
          isOpen: d.isOpen,
          rsvpOpensAt: fromIstInput(d.opens),
          rsvpClosesAt: fromIstInput(d.closes),
        })),
      },
      'Days saved.',
    );
  };

  const set = (id: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  if (!data) {
    return (
      <Card className="rounded-card p-5">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </Card>
    );
  }

  return (
    <Card
      className="space-y-4 rounded-card p-5"
      // Pressing Enter in a day field must not submit the settings form this card sits in.
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault();
      }}
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <CalendarDays className="size-4" aria-hidden /> Book by day
      </h3>

      {!data.dayBooking ? (
        <>
          <p className="text-sm text-muted-foreground">
            For events that run on more than one day. People pick the days they want, each day has
            its own seats, price and hours, and a ticket only works on its own day. Turn it on
            before the first booking.
          </p>
          {!data.canEnable && data.cannotEnableReason && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
              {data.cannotEnableReason}
            </p>
          )}
          <Button type="button" onClick={turnOn} loading={busy} disabled={!data.canEnable}>
            Turn on booking by day
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Each day below is sold on its own. To add or remove a day, change the event&apos;s start
            and end dates. Seats here replace the event-wide seat limit.
          </p>

          {data.isPaidEvent && (
            <div className="space-y-1.5">
              <label htmlFor="days-bundle" className="text-sm font-medium text-foreground">
                All days together (per person)
              </label>
              <Input
                id="days-bundle"
                inputMode="decimal"
                value={bundle}
                onChange={(e) => setBundle(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="No all-days price"
                className="h-11 sm:max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Used only when someone books every day and it is cheaper than paying day
                by day.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {drafts.map((d) => (
              <li key={d.id} className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {fmtDayRange(fromDayTime(d.dayDate, d.start), fromDayTime(d.dayDate, d.end))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.seatsTaken} booked · {d.checkedInCount} checked in
                    {d.waiting > 0 ? ` · ${d.waiting} waiting` : ''}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor={`d-label-${d.id}`} className="text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id={`d-label-${d.id}`}
                      value={d.label}
                      maxLength={80}
                      onChange={(e) => set(d.id, { label: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor={`d-start-${d.id}`} className="text-sm font-medium">
                        Opens
                      </label>
                      <Input
                        id={`d-start-${d.id}`}
                        type="time"
                        value={d.start}
                        onChange={(e) => set(d.id, { start: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`d-end-${d.id}`} className="text-sm font-medium">
                        Closes
                      </label>
                      <Input
                        id={`d-end-${d.id}`}
                        type="time"
                        value={d.end}
                        onChange={(e) => set(d.id, { end: e.target.value })}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`d-cap-${d.id}`} className="text-sm font-medium">
                      Seats this day
                    </label>
                    <Input
                      id={`d-cap-${d.id}`}
                      inputMode="numeric"
                      value={d.capacity}
                      placeholder="No limit"
                      onChange={(e) => set(d.id, { capacity: e.target.value.replace(/\D/g, '') })}
                      className="h-11"
                    />
                  </div>
                  {data.isPaidEvent && (
                    <div className="space-y-1.5">
                      <label htmlFor={`d-price-${d.id}`} className="text-sm font-medium">
                        Price per person
                      </label>
                      <Input
                        id={`d-price-${d.id}`}
                        inputMode="decimal"
                        value={d.price}
                        placeholder={
                          data.ticketPrice != null
                            ? `Event price ${rupees(data.ticketPrice)}`
                            : 'Event price'
                        }
                        onChange={(e) =>
                          set(d.id, { price: e.target.value.replace(/[^\d.]/g, '') })
                        }
                        className="h-11"
                      />
                    </div>
                  )}
                </div>

                <details className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">
                    Booking window for this day (optional)
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor={`d-opens-${d.id}`} className="text-sm font-medium">
                        Booking opens
                      </label>
                      <Input
                        id={`d-opens-${d.id}`}
                        type="datetime-local"
                        value={d.opens}
                        onChange={(e) => set(d.id, { opens: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`d-closes-${d.id}`} className="text-sm font-medium">
                        Booking closes
                      </label>
                      <Input
                        id={`d-closes-${d.id}`}
                        type="datetime-local"
                        value={d.closes}
                        onChange={(e) => set(d.id, { closes: e.target.value })}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Empty uses the ticket sale times above. India time.
                  </p>
                </details>

                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={d.isOpen}
                    onChange={(e) => set(d.id, { isOpen: e.target.checked })}
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                  />
                  <span className="text-sm">
                    <span className="block font-medium text-foreground">Open for booking</span>
                    <span className="block text-muted-foreground">
                      Untick to stop new bookings for this day only. Tickets already issued stay
                      valid.
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} loading={busy}>
              Save days
            </Button>
            <Button type="button" variant="outline" onClick={turnOff} disabled={busy}>
              Turn off booking by day
            </Button>
          </div>
        </>
      )}
      {!data.dayBooking && error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}
