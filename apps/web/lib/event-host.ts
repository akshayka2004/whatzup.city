import type { BookingState } from '@saas/types';

export interface HostSummary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string | null;
  status: string;
  bookingMode: 'NONE' | 'RSVP';
  bookingApproval: 'PENDING' | 'APPROVED' | 'REJECTED';
  state: BookingState;
  stateLabel: string;
  capacity: number | null;
  seatsTaken: number;
  checkedInCount: number;
  rsvpOpensAt: string | null;
  rsvpClosesAt: string | null;
  maxPerUser: number;
  cancelCutoffHours: number;
  venueCapacity: number | null;
  minAge: number | null;
  bookingNote: string | null;
  checkInOpensAt: string | null;
  checkInClosesAt: string | null;
  isPlatformEvent: boolean;
}

export interface EventAnalytics {
  event: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    capacity: number | null;
    venueCapacity: number | null;
    ended: boolean;
    checkInOpensAt: string;
    checkInClosesAt: string;
  };
  totals: {
    seatsConfirmed: number;
    registrants: number;
    cancelled: number;
    attended: number;
    stillExpected: number;
    noShows: number | null;
    showRate: number | null;
    fillRate: number | null;
    waitlist: number;
    firstTimeOnPlatformEvents: number;
  };
  rsvpByDay: { day: string; rsvps: number; cancelled: number }[];
  arrivals: {
    bucketMinutes: number;
    curve: { slot: string; n: number }[];
    peak: { slot: string; n: number } | null;
    medianMinutesBeforeStart: number | null;
    firstArrivalMinutesBeforeStart: number | null;
    lastArrivalMinutesBeforeStart: number | null;
  };
  gates: {
    id: string;
    label: string;
    level: string;
    checkedIn: number;
    first: string | null;
    last: string | null;
  }[];
  scans: {
    valid: number;
    manual: number;
    duplicates: number;
    invalid: number;
    cancelledTickets: number;
    outsideWindow: number;
    undone: number;
  };
  sources: { source: string; seats: number }[];
  generatedAt: string;
}

export interface CrewPass {
  id: string;
  label: string;
  level: 'SCAN' | 'DESK';
  code: string;
  codeDisplay: string;
  status: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'REVOKED';
  validFrom: string;
  validUntil: string;
  maxDevices: number;
  devicesInUse: number;
  checkedIn: number;
  lastUsedAt: string | null;
}

export interface AttendeeRow {
  id: string;
  code: string;
  holderName: string;
  isGuest: boolean;
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED';
  source: string | null;
  issuedAt: string;
  checkedInAt: string | null;
  registrant: { name: string; email: string; phone: string | null };
}

export const SOURCE_LABEL: Record<string, string> = {
  home: 'Home page',
  search: 'Search',
  events: 'Events list',
  share: 'Shared link',
  qr: 'QR code',
  invite: 'Friend invite',
  waitlist: 'Waitlist',
  direct: 'Direct',
};

/** "12 min before" / "5 min after" for arrival times measured against the start. */
export function minutesLabel(m: number | null | undefined): string {
  if (m == null) return '–';
  const abs = Math.abs(m);
  const text = abs >= 60 ? `${Math.floor(abs / 60)} h ${abs % 60} min` : `${abs} min`;
  return m >= 0 ? `${text} before` : `${text} after`;
}
