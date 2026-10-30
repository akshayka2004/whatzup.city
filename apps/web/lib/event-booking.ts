import type { BookingState } from '@saas/types';

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
}

export interface TicketLite {
  id: string;
  eventId?: string;
  code: string;
  holderName: string;
  isGuest: boolean;
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED';
  checkedInAt: string | null;
}

export interface MyBooking {
  tickets: TicketLite[];
  waitlist: { seats: number; position: number | null } | null;
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
