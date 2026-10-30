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
export function cancelDeadline(e: { startDate: Dateish; cancelCutoffHours?: number | null }): number {
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
