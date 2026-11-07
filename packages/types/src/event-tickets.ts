// ============================================================
// Event RSVP and tickets: rules shared by the API (which enforces them) and the web app (which
// shows them), so a page can never say "open" while the server says "closed".
// ============================================================

export type BookingMode = 'NONE' | 'RSVP';
export type BookingApproval = 'PENDING' | 'APPROVED' | 'REJECTED';

/** What a visitor sees on the event page. */
export type BookingState =
  | 'NONE' // no on-platform booking: listing only or an external link
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'NOT_OPEN'
  | 'OPEN'
  | 'FULL'
  | 'CLOSED'
  | 'ENDED'
  | 'CANCELLED';

export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'CANCELLED';

export type ScanResult =
  | 'VALID'
  | 'DUPLICATE'
  | 'INVALID'
  | 'WRONG_EVENT'
  | 'CANCELLED'
  | 'OUTSIDE_WINDOW'
  | 'WRONG_DAY'
  | 'MANUAL'
  | 'UNDO';

export type CrewLevel = 'SCAN' | 'DESK';

/** Where an RSVP came from, for the host's analytics. Anything else is stored as "direct". */
export const RSVP_SOURCES = [
  'home',
  'search',
  'events',
  'share',
  'qr',
  'invite',
  'waitlist',
  'direct',
] as const;
export type RsvpSource = (typeof RSVP_SOURCES)[number];

export const BOOKING_LIMITS = {
  /** Most seats one account can hold, whatever the host sets. */
  maxPerUserCap: 10,
  /** Most crew passes the host may have on one event. */
  maxCrewPasses: 100,
  /** Longest guest or holder name. */
  nameMax: 120,
  /** How long a check-in can be undone, in seconds. */
  undoSeconds: 60,
  /** Scanning opens this many hours before the start unless the host sets a time. */
  checkInOpensHoursBefore: 2,
  /** Scanning closes this many hours after the end unless the host sets a time. */
  checkInClosesHoursAfter: 2,
  /** Crew passes work from this many hours before the check-in window opens by default. */
  defaultCancelCutoffHours: 2,
} as const;

type Dateish = Date | string | number | null | undefined;
const t = (d: Dateish): number | null => {
  if (d === null || d === undefined) return null;
  const n = new Date(d).getTime();
  return Number.isFinite(n) ? n : null;
};

export interface BookingFields {
  bookingMode?: string | null;
  bookingApproval?: string | null;
  status?: string | null;
  capacity?: number | null;
  seatsTaken?: number | null;
  rsvpOpensAt?: Dateish;
  rsvpClosesAt?: Dateish;
  startDate: Dateish;
  endDate: Dateish;
}

/** The single answer to "can people RSVP right now". */
export function bookingState(e: BookingFields, now: Dateish = Date.now()): BookingState {
  if (e.bookingMode !== 'RSVP') return 'NONE';
  if (e.status && e.status !== 'ACTIVE') return 'CANCELLED';
  if (e.bookingApproval === 'PENDING') return 'PENDING_APPROVAL';
  if (e.bookingApproval === 'REJECTED') return 'REJECTED';
  const at = t(now) ?? Date.now();
  const end = t(e.endDate);
  if (end !== null && at > end) return 'ENDED';
  const opens = t(e.rsvpOpensAt);
  if (opens !== null && at < opens) return 'NOT_OPEN';
  // Sales close at the host's time, or when the event starts if none is set.
  const closes = t(e.rsvpClosesAt) ?? t(e.startDate);
  if (closes !== null && at > closes) return 'CLOSED';
  if (e.capacity != null && (e.seatsTaken ?? 0) >= e.capacity) return 'FULL';
  return 'OPEN';
}

/** Seats still free, or null when the event has no limit. */
export function seatsLeft(e: Pick<BookingFields, 'capacity' | 'seatsTaken'>): number | null {
  return e.capacity == null ? null : Math.max(0, e.capacity - (e.seatsTaken ?? 0));
}

/** When scanning is accepted, as epoch milliseconds. */
export function checkInWindow(e: {
  startDate: Dateish;
  endDate: Dateish;
  checkInOpensAt?: Dateish;
  checkInClosesAt?: Dateish;
}): { opens: number; closes: number } {
  const start = t(e.startDate) ?? 0;
  const end = t(e.endDate) ?? start;
  const HOUR = 3_600_000;
  return {
    opens: t(e.checkInOpensAt) ?? start - BOOKING_LIMITS.checkInOpensHoursBefore * HOUR,
    closes: t(e.checkInClosesAt) ?? end + BOOKING_LIMITS.checkInClosesHoursAfter * HOUR,
  };
}

/** Last moment an attendee may cancel. */
export function cancelDeadline(e: {
  startDate: Dateish;
  cancelCutoffHours?: number | null;
}): number {
  const start = t(e.startDate) ?? 0;
  const hours = e.cancelCutoffHours ?? BOOKING_LIMITS.defaultCancelCutoffHours;
  return start - hours * 3_600_000;
}

/** Plain-language label for each state, shown on the event page. */
export const BOOKING_STATE_LABEL: Record<BookingState, string> = {
  NONE: '',
  PENDING_APPROVAL: 'RSVP opens once the event is approved',
  REJECTED: 'RSVP is not available for this event',
  NOT_OPEN: 'RSVP has not opened yet',
  OPEN: 'RSVP open',
  FULL: 'Fully booked',
  CLOSED: 'RSVP has closed',
  ENDED: 'This event has ended',
  CANCELLED: 'This event was cancelled',
};

// ============================================================
// Booking by day. A multi-day event can sell each day on its own: every day has its own seats,
// price, hours and booking window, and a ticket admits to one day. The same helpers run on the API
// (which enforces them) and in the web app (which shows them).
// ============================================================

/** A money amount as a number, a string or a database decimal. */
export type Money = number | string | { toString(): string } | null | undefined;

export interface DayFields {
  id?: string;
  dayDate: string;
  label: string;
  startsAt: Dateish;
  endsAt: Dateish;
  capacity?: number | null;
  seatsTaken?: number | null;
  price?: Money;
  isOpen?: boolean | null;
  rsvpOpensAt?: Dateish;
  rsvpClosesAt?: Dateish;
}

/** India has no daylight saving, so a fixed offset is exact. */
const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
export const MAX_EVENT_DAYS = 31;

/** The calendar day in India (YYYY-MM-DD) that a moment falls on. */
export function istDay(at: Dateish): string {
  const n = t(at) ?? Date.now();
  return new Date(n + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight at the start of an Indian calendar day, as epoch milliseconds. */
function istMidnight(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One entry per calendar day (India time) between the start and the end of an event. */
export function eventDays(
  start: Dateish,
  end: Dateish,
): { dayDate: string; label: string; startsAt: Date; endsAt: Date }[] {
  const s = t(start);
  const e = t(end);
  if (s === null || e === null || e <= s) return [];
  const out: { dayDate: string; label: string; startsAt: Date; endsAt: Date }[] = [];
  let cursor = istMidnight(istDay(s));
  while (cursor <= e && out.length < MAX_EVENT_DAYS) {
    const day = istDay(cursor + IST_OFFSET_MS);
    const dayStart = Math.max(s, cursor);
    const dayEnd = Math.min(e, cursor + DAY_MS - 1);
    const weekday = WEEKDAY[new Date(cursor + IST_OFFSET_MS).getUTCDay()];
    out.push({
      dayDate: day,
      label: `Day ${out.length + 1} - ${weekday}`,
      startsAt: new Date(dayStart),
      endsAt: new Date(dayEnd),
    });
    cursor += DAY_MS;
  }
  return out;
}

/** The answer to "can people book this day right now". Same states as a whole event. */
export function dayState(e: BookingFields, d: DayFields, now: Dateish = Date.now()): BookingState {
  if (e.bookingMode !== 'RSVP') return 'NONE';
  if (e.status && e.status !== 'ACTIVE') return 'CANCELLED';
  if (e.bookingApproval === 'PENDING') return 'PENDING_APPROVAL';
  if (e.bookingApproval === 'REJECTED') return 'REJECTED';
  const at = t(now) ?? Date.now();
  const end = t(d.endsAt);
  if (end !== null && at > end) return 'ENDED';
  if (d.isOpen === false) return 'CLOSED';
  const opens = t(d.rsvpOpensAt) ?? t(e.rsvpOpensAt);
  if (opens !== null && at < opens) return 'NOT_OPEN';
  // A day's own closing time wins, then the event's, then the moment that day starts.
  const closes = t(d.rsvpClosesAt) ?? t(e.rsvpClosesAt) ?? t(d.startsAt);
  if (closes !== null && at > closes) return 'CLOSED';
  if (d.capacity != null && (d.seatsTaken ?? 0) >= d.capacity) return 'FULL';
  return 'OPEN';
}

/** One answer for a whole day-booked event: open if any day is open, and so on. */
export function bookingStateForDays(
  e: BookingFields,
  days: DayFields[],
  now: Dateish = Date.now(),
): BookingState {
  if (days.length === 0) return bookingState(e, now);
  const states = days.map((d) => dayState(e, d, now));
  for (const s of ['NONE', 'CANCELLED', 'PENDING_APPROVAL', 'REJECTED'] as const) {
    if (states[0] === s) return s;
  }
  if (states.includes('OPEN')) return 'OPEN';
  if (states.includes('NOT_OPEN')) return 'NOT_OPEN';
  if (states.includes('FULL')) return 'FULL';
  if (states.every((s) => s === 'ENDED')) return 'ENDED';
  return 'CLOSED';
}

export interface DayPricing {
  /** What each person pays in total for the chosen days. */
  perPerson: number;
  /** True when the all-days price replaced the sum of the days. */
  bundle: boolean;
  lines: { dayId: string; label: string; price: number }[];
}

/**
 * Price per person for a set of days. A day with no price of its own uses the event's ticket price
 * (zero on a free event). Choosing every day of the event uses the all-days price when the host set
 * one and it is lower than paying day by day.
 */
export function dayPricing(
  e: { ticketType?: string | null; ticketPrice?: Money; allDaysPrice?: Money },
  chosen: (DayFields & { id: string })[],
  allDays: (DayFields & { id: string })[],
): DayPricing {
  const base = e.ticketType === 'PAID' ? Number(e.ticketPrice ?? 0) || 0 : 0;
  const lines = chosen.map((d) => ({
    dayId: d.id,
    label: d.label,
    price: d.price === null || d.price === undefined ? base : Number(d.price) || 0,
  }));
  const sum = Math.round(lines.reduce((n, l) => n + l.price, 0) * 100) / 100;
  const bundle =
    e.allDaysPrice === null || e.allDaysPrice === undefined ? null : Number(e.allDaysPrice);
  const everyDay = allDays.length > 1 && chosen.length === allDays.length;
  if (everyDay && bundle !== null && Number.isFinite(bundle) && bundle >= 0 && bundle < sum) {
    return { perPerson: Math.round(bundle * 100) / 100, bundle: true, lines };
  }
  return { perPerson: sum, bundle: false, lines };
}
