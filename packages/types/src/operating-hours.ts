// ============================================================
// Operating hours — one definition shared by the API (validation)
// and the web app (editor + "open now" display).
//
// Stored in Business.operatingHours (Json):
//   {
//     version: 1,
//     weekly: { mon: { closed: false, shifts: [{ open: '09:00', close: '13:00' }, { open: '16:00', close: '21:00' }] }, ... },
//     closures: [{ id, from: '2026-10-20', to: '2026-10-22', reason: 'Renovation' }]
//   }
//
// Shifts do not cross midnight: an after-midnight business adds a shift ending 24:00 and a shift
// starting 00:00 on the next day. All times are Indian Standard Time (the platform is Kerala-only).
// ============================================================

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const MAX_SHIFTS_PER_DAY = 4;
export const MAX_CLOSURES = 20;
export const MAX_CLOSURE_REASON = 120;

export interface Shift {
  /** HH:MM, 24h */
  open: string;
  /** HH:MM, 24h; 24:00 means midnight at the end of the day */
  close: string;
}

export interface DaySchedule {
  closed: boolean;
  shifts: Shift[];
}

export interface Closure {
  id: string;
  /** YYYY-MM-DD, inclusive */
  from: string;
  /** YYYY-MM-DD, inclusive */
  to: string;
  reason: string;
}

export interface OperatingHours {
  version: 1;
  weekly: Record<DayKey, DaySchedule>;
  closures: Closure[];
}

const OPEN_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const CLOSE_RE = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** A fresh schedule for the editor: every day open 09:00-18:00. */
export function defaultOperatingHours(): OperatingHours {
  const weekly = {} as Record<DayKey, DaySchedule>;
  for (const day of DAY_KEYS) weekly[day] = { closed: false, shifts: [{ open: '09:00', close: '18:00' }] };
  return { version: 1, weekly, closures: [] };
}

export type OperatingHoursResult =
  | { ok: true; value: OperatingHours }
  | { ok: false; errors: string[] };

/**
 * Validates and normalises untrusted input (a request body). Returns clean data with unknown keys
 * dropped, or a list of human-readable problems. `null`/`undefined` is "not provided", not an error.
 */
export function validateOperatingHours(input: unknown): OperatingHoursResult {
  const errors: string[] = [];
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Opening hours must be an object.'] };
  }
  const raw = input as Record<string, any>;

  const weekly = {} as Record<DayKey, DaySchedule>;
  const rawWeekly = raw.weekly && typeof raw.weekly === 'object' ? raw.weekly : {};
  for (const day of DAY_KEYS) {
    const label = DAY_LABELS[day];
    const d = rawWeekly[day];
    if (d === undefined || d === null) {
      weekly[day] = { closed: true, shifts: [] };
      continue;
    }
    if (typeof d !== 'object' || Array.isArray(d)) {
      errors.push(`${label}: invalid schedule.`);
      weekly[day] = { closed: true, shifts: [] };
      continue;
    }
    const closed = d.closed === true;
    const shiftsRaw: any[] = Array.isArray(d.shifts) ? d.shifts : [];
    if (closed) {
      weekly[day] = { closed: true, shifts: [] };
      continue;
    }
    if (shiftsRaw.length === 0) {
      errors.push(`${label}: add at least one opening shift or mark the day closed.`);
    }
    if (shiftsRaw.length > MAX_SHIFTS_PER_DAY) {
      errors.push(`${label}: at most ${MAX_SHIFTS_PER_DAY} shifts per day.`);
    }
    const shifts: Shift[] = [];
    for (const s of shiftsRaw.slice(0, MAX_SHIFTS_PER_DAY)) {
      const open = typeof s?.open === 'string' ? s.open : '';
      const close = typeof s?.close === 'string' ? s.close : '';
      if (!OPEN_RE.test(open) || !CLOSE_RE.test(close)) {
        errors.push(`${label}: times must look like 09:30 (use 24:00 for midnight).`);
        continue;
      }
      if (open >= close) {
        errors.push(`${label}: a shift must close after it opens (${open}-${close}).`);
        continue;
      }
      shifts.push({ open, close });
    }
    shifts.sort((a, b) => (a.open < b.open ? -1 : a.open > b.open ? 1 : 0));
    for (let i = 1; i < shifts.length; i++) {
      if (shifts[i].open < shifts[i - 1].close) {
        errors.push(`${label}: shifts overlap (${shifts[i - 1].open}-${shifts[i - 1].close} and ${shifts[i].open}-${shifts[i].close}).`);
        break;
      }
    }
    weekly[day] = { closed: false, shifts };
  }

  const closures: Closure[] = [];
  const rawClosures: any[] = Array.isArray(raw.closures) ? raw.closures : [];
  if (rawClosures.length > MAX_CLOSURES) errors.push(`At most ${MAX_CLOSURES} special closures.`);
  rawClosures.slice(0, MAX_CLOSURES).forEach((c, i) => {
    const n = i + 1;
    const from = typeof c?.from === 'string' ? c.from : '';
    const to = typeof c?.to === 'string' ? c.to : from;
    if (!isRealDate(from) || !isRealDate(to)) {
      errors.push(`Closure ${n}: dates must be real dates (YYYY-MM-DD).`);
      return;
    }
    if (from > to) {
      errors.push(`Closure ${n}: the end date is before the start date.`);
      return;
    }
    const reason = typeof c?.reason === 'string' ? c.reason.trim() : '';
    if (reason.length > MAX_CLOSURE_REASON) {
      errors.push(`Closure ${n}: the reason is too long (${MAX_CLOSURE_REASON} characters max).`);
      return;
    }
    const id = typeof c?.id === 'string' && c.id.length > 0 && c.id.length <= 40 ? c.id : `c${n}-${from}`;
    closures.push({ id, from, to, reason });
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { version: 1, weekly, closures } };
}

/** True when the business set at least one open day with a shift (used for "profile complete" checks). */
export function hasOperatingHours(hours: unknown): boolean {
  const r = validateOperatingHours(hours);
  if (!r.ok) return false;
  return DAY_KEYS.some((d) => !r.value.weekly[d].closed && r.value.weekly[d].shifts.length > 0);
}

/** "13:00" -> "1:00 PM", "24:00" -> "12:00 AM". */
export function formatTime12(hhmm: string): string {
  const [hStr, m] = hhmm.split(':');
  let h = Number(hStr);
  const suffix = h >= 12 && h < 24 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${suffix}`;
}

const IST = 'Asia/Kolkata';

/** The wall-clock date, weekday and HH:MM in IST for a given instant. */
export function istParts(now: Date): { date: string; day: DayKey; time: string } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
  const dayMap: Record<string, DayKey> = {
    Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
  };
  const hour = p.hour === '24' ? '00' : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, day: dayMap[p.weekday], time: `${hour}:${p.minute}` };
}

export interface OpenStatus {
  isOpen: boolean;
  /** Short line for a badge, e.g. "Open now · closes 9:00 PM" or "Closed · opens Tue 9:00 AM". */
  label: string;
  /** Set when a special closure covers today. */
  closure?: Closure;
}

function closureOn(hours: OperatingHours, date: string): Closure | undefined {
  return hours.closures.find((c) => c.from <= date && date <= c.to);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const SHORT_DAY: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

/** Whether the business is open at `now`, plus a human label for the next change. Pure; IST. */
export function getOpenStatus(hoursInput: unknown, now: Date = new Date()): OpenStatus | null {
  const r = validateOperatingHours(hoursInput);
  if (!r.ok) return null;
  const hours = r.value;
  const { date, day, time } = istParts(now);

  const todayClosure = closureOn(hours, date);
  if (!todayClosure) {
    const today = hours.weekly[day];
    if (!today.closed) {
      const current = today.shifts.find((s) => s.open <= time && time < s.close);
      if (current) {
        return { isOpen: true, label: `Open now · closes ${formatTime12(current.close)}` };
      }
      const upcoming = today.shifts.find((s) => s.open > time);
      if (upcoming) {
        return { isOpen: false, label: `Closed · opens ${formatTime12(upcoming.open)}` };
      }
    }
  }

  // Look ahead up to 14 days for the next opening.
  for (let i = 1; i <= 14; i++) {
    const nextDate = addDays(date, i);
    if (closureOn(hours, nextDate)) continue;
    const dow = DAY_KEYS[(DAY_KEYS.indexOf(day) + i) % 7];
    const sched = hours.weekly[dow];
    if (!sched.closed && sched.shifts.length) {
      const when = i === 1 ? 'tomorrow' : SHORT_DAY[dow];
      return {
        isOpen: false,
        label: `Closed · opens ${when} ${formatTime12(sched.shifts[0].open)}`,
        closure: todayClosure,
      };
    }
  }
  return { isOpen: false, label: 'Closed', closure: todayClosure };
}
