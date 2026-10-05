'use client';

/**
 * Weekly opening hours (multiple shifts per day) plus special closures.
 * Controlled: pass the current OperatingHours and receive a new object on
 * every change. Times are IST, 24h strings; a shift can end at "24:00"
 * (midnight) but never cross it. Validation hints come from the same
 * `validateOperatingHours` the API uses, so what shows here is what the
 * server will accept.
 */

import { useMemo } from 'react';
import { AlertCircle, CalendarOff, Clock, Copy, Moon, Plus, Trash2, X } from 'lucide-react';
import {
  DAY_KEYS, DAY_LABELS, MAX_SHIFTS_PER_DAY, MAX_CLOSURES, MAX_CLOSURE_REASON,
  defaultOperatingHours, validateOperatingHours, istParts,
  type OperatingHours, type DaySchedule, type Shift, type Closure, type DayKey,
} from '@saas/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRESETS: { label: string; shift: Shift }[] = [
  { label: '9 AM – 6 PM', shift: { open: '09:00', close: '18:00' } },
  { label: '10 AM – 10 PM', shift: { open: '10:00', close: '22:00' } },
  { label: '24 hours', shift: { open: '00:00', close: '24:00' } },
];

const timeInputCls =
  'h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function nextShift(shifts: Shift[]): Shift {
  const last = shifts[shifts.length - 1];
  if (!last || !last.close) return { open: '09:00', close: '18:00' };
  const start = Math.min(toMin(last.close), 22 * 60);
  const end = Math.min(start + 180, 24 * 60);
  return { open: fromMin(start), close: end === 24 * 60 ? '24:00' : fromMin(end) };
}

function newClosureId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function OperatingHoursEditor({
  value,
  onChange,
}: {
  value?: OperatingHours | null;
  onChange: (v: OperatingHours) => void;
}) {
  const errors = useMemo(() => {
    if (!value) return [];
    const r = validateOperatingHours(value);
    return r.ok ? [] : r.errors;
  }, [value]);

  if (!value) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background/50 p-4 text-center">
        <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">No opening hours set yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Customers see when you are open, and whether you are open right now.
        </p>
        <Button type="button" size="sm" className="ui-press mt-3 min-h-10" onClick={() => onChange(defaultOperatingHours())}>
          Set opening hours
        </Button>
      </div>
    );
  }

  const hours = value;
  const setDay = (day: DayKey, next: DaySchedule) =>
    onChange({ ...hours, weekly: { ...hours.weekly, [day]: next } });
  const setClosures = (closures: Closure[]) => onChange({ ...hours, closures });

  const applyToAll = (build: (current: DaySchedule) => DaySchedule) => {
    const weekly = { ...hours.weekly };
    for (const d of DAY_KEYS) weekly[d] = build(hours.weekly[d]);
    onChange({ ...hours, weekly });
  };
  const applyPreset = (shift: Shift) =>
    applyToAll((cur) => (cur.closed ? cur : { closed: false, shifts: [{ ...shift }] }));
  const copyMonday = () => {
    const mon = hours.weekly.mon;
    applyToAll(() => ({ closed: mon.closed, shifts: mon.shifts.map((s) => ({ ...s })) }));
  };

  return (
    <div className="space-y-5">
      {/* Shortcuts */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Quick presets (applies to open days)</p>
        <div className="ui-scroll-x flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.shift)}
              className="ui-press min-h-10 shrink-0 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={copyMonday}
            className="ui-press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Monday to all days
          </button>
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="space-y-2.5">
        {DAY_KEYS.map((day) => {
          const sched = hours.weekly[day];
          const open = !sched.closed;
          return (
            <div key={day} className="rounded-xl border border-border bg-background/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{DAY_LABELS[day]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={open}
                  aria-label={`${DAY_LABELS[day]} is ${open ? 'open' : 'closed'}`}
                  onClick={() =>
                    setDay(
                      day,
                      open
                        ? { ...sched, closed: true }
                        : { closed: false, shifts: sched.shifts.length ? sched.shifts : [{ open: '09:00', close: '18:00' }] },
                    )
                  }
                  className={cn(
                    'ui-press inline-flex min-h-10 min-w-[5.5rem] items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors',
                    open
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {open ? 'Open' : 'Closed'}
                </button>
              </div>

              {open && (
                <div className="mt-3 space-y-3">
                  {sched.shifts.map((shift, i) => {
                    const midnight = shift.close === '24:00';
                    const setShift = (patch: Partial<Shift>) =>
                      setDay(day, { ...sched, shifts: sched.shifts.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
                    const removeShift = () => {
                      const rest = sched.shifts.filter((_, j) => j !== i);
                      setDay(day, rest.length ? { ...sched, shifts: rest } : { closed: true, shifts: [] });
                    };
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="grid grid-cols-[1fr_1fr_2.5rem] items-end gap-2">
                          <label className="block space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {sched.shifts.length > 1 ? `Shift ${i + 1} opens` : 'Opens'}
                            </span>
                            <input
                              type="time"
                              value={shift.open}
                              onChange={(e) => setShift({ open: e.target.value })}
                              className={timeInputCls}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground">Closes</span>
                            {midnight ? (
                              <div className={cn(timeInputCls, 'flex items-center text-muted-foreground')}>12:00 AM</div>
                            ) : (
                              <input
                                type="time"
                                value={shift.close}
                                onChange={(e) => setShift({ close: e.target.value })}
                                className={timeInputCls}
                              />
                            )}
                          </label>
                          <button
                            type="button"
                            onClick={removeShift}
                            aria-label={`Remove shift ${i + 1} on ${DAY_LABELS[day]}`}
                            className="ui-press flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-pressed={midnight}
                          onClick={() =>
                            setShift({
                              close: midnight
                                ? shift.open && shift.open < '23:30' ? '23:30' : ''
                                : '24:00',
                            })
                          }
                          className={cn(
                            'ui-press inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                            midnight
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <Moon className="h-3 w-3" /> Till midnight
                        </button>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ui-press min-h-10"
                    disabled={sched.shifts.length >= MAX_SHIFTS_PER_DAY}
                    onClick={() => setDay(day, { ...sched, shifts: [...sched.shifts, nextShift(sched.shifts)] })}
                  >
                    <Plus className="h-4 w-4" /> Add a shift
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Special closures */}
      <div className="space-y-3">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarOff className="h-4 w-4 text-muted-foreground" /> Special closures
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Holidays, renovation or events. Weekly off days are the Closed toggles above.
          </p>
        </div>

        {hours.closures.map((c, i) => {
          const patch = (p: Partial<Closure>) =>
            setClosures(hours.closures.map((x, j) => (j === i ? { ...x, ...p } : x)));
          return (
            <div key={c.id || i} className="ui-fade-up space-y-2 rounded-xl border border-border bg-background/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Closure {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setClosures(hours.closures.filter((_, j) => j !== i))}
                  aria-label={`Remove closure ${i + 1}`}
                  className="ui-press flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">From</span>
                  <input
                    type="date"
                    value={c.from}
                    onChange={(e) => patch({ from: e.target.value, ...(c.to < e.target.value ? { to: e.target.value } : {}) })}
                    className={timeInputCls}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">To (inclusive)</span>
                  <input
                    type="date"
                    value={c.to}
                    min={c.from || undefined}
                    onChange={(e) => patch({ to: e.target.value })}
                    className={timeInputCls}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Reason (optional)</span>
                <input
                  type="text"
                  value={c.reason}
                  maxLength={MAX_CLOSURE_REASON}
                  onChange={(e) => patch({ reason: e.target.value })}
                  placeholder="e.g. Onam holiday, renovation"
                  className={timeInputCls}
                />
              </label>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ui-press min-h-10"
          disabled={hours.closures.length >= MAX_CLOSURES}
          onClick={() => {
            const today = istParts(new Date()).date;
            setClosures([...hours.closures, { id: newClosureId(), from: today, to: today, reason: '' }]);
          }}
        >
          <Plus className="h-4 w-4" /> Add closure
        </Button>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> Fix these before saving
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-destructive">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
