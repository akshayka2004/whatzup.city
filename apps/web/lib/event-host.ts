import type { BookingState, PaymentAction, PaymentStatus } from '@saas/types';

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
  ticketType: string;
  ticketPrice: number | null;
  ticketTiers: { name: string; price: number }[];
  isPaidEvent: boolean;
  payEnabled: boolean;
  payConfirmedAt: string | null;
  payUpiId: string | null;
  payPhone: string | null;
  payeeName: string | null;
  payQrImage: string | null;
  payWindowHours: number;
  paymentsToVerify: number;
  paymentsWaiting: number;
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
  revenue?: {
    paidEvent: boolean;
    verified: number;
    verifiedCount: number;
    awaitingVerification: number;
    held: number;
    unpaidSeats: number;
    expired: number;
  };
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
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'PENDING';
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

export interface PaymentSummary {
  counts: Record<PaymentStatus, number>;
  verifiedAmount: number;
  awaitingAmount: number;
  heldAmount: number;
  overdue?: number;
}

export interface PaymentRow {
  id: string;
  eventId: string;
  status: PaymentStatus;
  amount: number;
  seats: number;
  tier: string | null;
  utr: string | null;
  hasScreenshot: boolean;
  submittedAt: string | null;
  expiresAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  resubmitCount: number;
  createdAt: string;
  overdue: boolean;
  payer: { name: string; email: string; phone: string | null };
  event?: { id: string; title: string; startDate: string; host: string };
}

export interface PaymentDetail extends Omit<PaymentRow, 'event'> {
  payerNote: string | null;
  proofUrl: string | null;
  sameReference: { id: string; eventId: string; status: string }[];
  tickets: { id: string; holderName: string; isGuest: boolean; code: string; status: string }[];
  logs: {
    id: string;
    action: PaymentAction;
    actorRole: 'ATTENDEE' | 'HOST' | 'ADMIN' | 'SYSTEM';
    detail: Record<string, unknown> | null;
    createdAt: string;
  }[];
  event: { id: string; title: string; startDate: string; businessId: string | null };
}

export interface BusinessEventRow {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  city: string | null;
  posterImage: string | null;
  isPaid: boolean;
  takesRsvp: boolean;
  ended: boolean;
  capacity: number | null;
  confirmed: number;
  attended: number;
  cancelled: number;
  noShows: number | null;
  showRate: number | null;
  fillRate: number | null;
  revenue: number;
  awaiting: number;
  toVerify: number;
}

export interface BusinessOverview {
  totals: {
    events: number;
    upcoming: number;
    held: number;
    rsvps: number;
    attended: number;
    cancelled: number;
    showRate: number | null;
    avgFillRate: number | null;
    verifiedRevenue: number;
    awaitingRevenue: number;
    paidEvents: number;
    toVerify: number;
  };
  events: BusinessEventRow[];
  sources: { source: string; seats: number }[];
  generatedAt: string;
}

/** Plain-language label for each step in a payment's trail. */
export const PAYMENT_ACTION_LABEL: Record<PaymentAction, string> = {
  CREATED: 'Seat held, waiting for payment',
  PROOF_SUBMITTED: 'Attendee sent payment proof',
  APPROVED: 'Payment verified and ticket issued',
  REJECTED: 'Payment rejected, seat released',
  RESUBMIT_REQUESTED: 'Host asked for corrected proof',
  EXPIRED: 'Time ran out, seat released',
  CANCELLED: 'Cancelled',
  REMINDER: 'Reminder sent to the host',
  REFUND_DUE: 'Refund may be due',
};
