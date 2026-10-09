'use client';

/** Public-page opening hours: live open/closed status, the weekly list and upcoming closures. */

import { useEffect, useState } from 'react';
import { CalendarOff, ChevronDown, Clock } from 'lucide-react';
import {
  DAY_KEYS,
  DAY_LABELS,
  formatTime12,
  getOpenStatus,
  hasOperatingHours,
  istParts,
  validateOperatingHours,
} from '@saas/types';
import { cn } from '@/lib/utils';

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

const fmtShifts = (shifts: { open: string; close: string }[]) =>
  shifts
    .map(
      (s) =>
        `${formatTime12(s.open)} – ${s.close === '24:00' ? 'Midnight' : formatTime12(s.close)}`,
    )
    .join(' / ');

export function OpeningHoursCard({
  hours,
  className,
  collapsible = false,
}: {
  hours: unknown;
  className?: string;
  /** Phone-friendly mode: show today's hours and tuck the full week behind a toggle. */
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Status depends on the viewer's clock, so it is computed after mount to keep SSR and hydration identical.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!hasOperatingHours(hours)) return null;
  const parsed = validateOperatingHours(hours);
  if (!parsed.ok) return null;
  const h = parsed.value;

  const status = now ? getOpenStatus(h, now) : null;
  const parts = now ? istParts(now) : null;
  const upcoming = parts ? h.closures.filter((c) => c.to >= parts.date) : [];
  const closureNow = status?.closure;
  const todaySched = parts ? h.weekly[parts.day] : null;
  const todayText = todaySched
    ? todaySched.closed || todaySched.shifts.length === 0
      ? 'Closed today'
      : fmtShifts(todaySched.shifts)
    : null;
  const showWeek = !collapsible || expanded;

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" /> Opening hours
        </h3>
        {status && (
          <span
            className={cn(
              'ui-pop inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
              status.isOpen ? 'bg-success/15 text-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {status.isOpen ? (
              <span className="ui-live-dot" aria-hidden />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            )}
            {status.label}
          </span>
        )}
      </div>

      {closureNow && (
        <p className="mt-2 text-xs text-muted-foreground">
          Temporarily closed{closureNow.reason ? `: ${closureNow.reason}` : ''} (until{' '}
          {fmtDate(closureNow.to)})
        </p>
      )}

      {collapsible && todayText && (
        <p className="mt-2 text-sm text-foreground">
          <span className="font-semibold text-primary">Today</span> · {todayText}
        </p>
      )}

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-lg text-sm font-semibold text-primary"
        >
          {expanded ? 'Hide weekly hours' : 'See weekly hours'}
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform motion-reduce:transition-none',
              expanded && 'rotate-180',
            )}
          />
        </button>
      )}

      {showWeek && (
        <ul
          className={cn('divide-y divide-border text-sm', collapsible ? 'ui-fade-up mt-1' : 'mt-3')}
        >
          {DAY_KEYS.map((day) => {
            const sched = h.weekly[day];
            const isToday = parts?.day === day;
            const closed = sched.closed || sched.shifts.length === 0;
            return (
              <li
                key={day}
                className={cn(
                  'flex items-start justify-between gap-3 py-2',
                  isToday && '-mx-2 rounded-lg bg-primary/5 px-2 font-semibold',
                )}
              >
                <span className={cn('shrink-0', isToday ? 'text-primary' : 'text-foreground')}>
                  {DAY_LABELS[day]}
                </span>
                <span
                  className={cn('text-right', closed ? 'text-muted-foreground' : 'text-foreground')}
                >
                  {closed ? 'Closed' : fmtShifts(sched.shifts)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {upcoming.length > 0 && (
        <div className="mt-3 rounded-xl bg-muted/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" /> Upcoming closures
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {upcoming.map((c) => (
              <li key={c.id}>
                <span className="font-medium text-foreground">
                  {c.from === c.to ? fmtDate(c.from) : `${fmtDate(c.from)} – ${fmtDate(c.to)}`}
                </span>
                {c.reason ? ` · ${c.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
