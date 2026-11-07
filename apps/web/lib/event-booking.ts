import type { BookingState, PaymentStatus } from '@saas/types';

/** One day of an event that sells by day, as the public page shows it. */
export interface DayInfo {
  id: string;
  dayDate: string;
  label: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  seatsLeft: number | null;
  /** What one person pays for this day (0 = free). */
  price: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  state: BookingState;
  stateLabel: string;
  waitlistOpen: boolean;
}

/** What GET /v1/events/:id/booking returns. */
export interface BookingInfo {
  eventId: string;
  mode: 'NONE' | 'RSVP';
  state: BookingState;
  stateLabel: string;
  capacity: number | null;
  seatsLeft: number | null;
  opensAt: string | null;
  closesAt: string | null;
  maxPerUser: number;
  cancelDeadline: string;
  minAge: number | null;
  note: string | null;
  waitlistOpen: boolean;
  /** True when each day of the event is booked on its own. */
  dayBooking?: boolean;
  /** Price per person for every day together, when the host set one. */
  allDaysPrice?: number | null;
  days?: DayInfo[];
  /** Price information. Where to pay is only sent to someone holding a seat. */
  payment?:
    | { required: false }
    | {
        required: true;
        price: number | null;
        tiers: { name: string; price: number }[];
        windowHours: number;
        /** Each day has its own price (see days). */
        perDay?: boolean;
      };
}

/** A payment as the attendee sees it in lists. */
export interface PaymentCard {
  id: string;
  eventId: string;
  status: PaymentStatus;
  amount: number;
  seats: number;
  tier: string | null;
  expiresAt: string;
  submittedAt: string | null;
  note: string | null;
}

export interface TicketLite {
  id: string;
  eventId?: string;
  code: string;
  holderName: string;
  isGuest: boolean;
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'PENDING';
  checkedInAt: string | null;
  paymentId?: string | null;
  dayId?: string | null;
  /** The day this ticket admits to, on events booked by day. */
  day?: {
    id: string;
    label: string;
    dayDate: string;
    startsAt: string;
    endsAt: string;
    cancelDeadline: string;
  } | null;
}

export interface MyBooking {
  tickets: TicketLite[];
  payments?: PaymentCard[];
  waitlist: { seats: number; position: number | null } | null;
  /** One entry per day waited for (a single entry without a day on ordinary events). */
  waitlists?: { seats: number; position: number; dayId: string | null; dayLabel: string | null }[];
}

/** Plain date and time in India Standard Time, e.g. "Sat 8 Nov, 6:30 pm". */
export function fmtWhen(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "6:30 pm" in IST. */
export function fmtClock(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "Fri 6 Nov, 10:30 am to 8:30 pm" for one day of an event. */
export function fmtDayRange(
  startsAt: string | Date | null | undefined,
  endsAt: string | Date | null | undefined,
): string {
  if (!startsAt) return '';
  const date = new Date(startsAt).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return endsAt
    ? `${date}, ${fmtClock(startsAt)} to ${fmtClock(endsAt)}`
    : `${date}, ${fmtClock(startsAt)}`;
}

/** The short code in groups that are easy to read aloud: K7M-3Q9. */
export const prettyCode = (code: string) =>
  code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;

/** An ISO time as the "YYYY-MM-DDTHH:mm" a datetime-local input wants, in IST. */
export function toIstInput(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const s = new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }); // 2026-11-08 18:30:00
  return s.replace(' ', 'T').slice(0, 16);
}

/** What a datetime-local input holds (read as IST) back to an ISO string; null when empty. */
export function fromIstInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
