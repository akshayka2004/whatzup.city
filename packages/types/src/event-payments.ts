// ============================================================
// Paid event tickets: rules shared by the API (which enforces them) and the web app (which shows
// them). Attendees pay the host's UPI directly; the platform only records and monitors it.
// ============================================================

export type PaymentStatus =
  | 'PENDING' // seat held, waiting for the attendee's proof
  | 'SUBMITTED' // proof sent, host to verify
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type PaymentAction =
  | 'CREATED'
  | 'PROOF_SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESUBMIT_REQUESTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REMINDER'
  | 'REFUND_DUE';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Waiting for your payment proof',
  SUBMITTED: 'Waiting for the host to verify',
  APPROVED: 'Payment verified',
  REJECTED: 'Payment rejected',
  EXPIRED: 'Time ran out',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_LIMITS = {
  /** Hours the host has to verify before they and the admins see it as overdue. */
  verifyReminderHours: 24,
  defaultWindowHours: 24,
  minWindowHours: 1,
  maxWindowHours: 72,
  /** Times an attendee may resend proof after the host asks for a correction. */
  maxResubmits: 3,
  utrMin: 10,
  utrMax: 22,
  noteMax: 300,
} as const;

/** name@bank. Letters, digits, dot, dash, underscore before the @. */
export const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,60}@[a-zA-Z][a-zA-Z0-9]{1,40}$/;
/** Indian mobile number, 10 digits starting 6-9 (a +91 or 0 prefix is stripped first). */
export const IN_MOBILE_PATTERN = /^[6-9]\d{9}$/;
/** UPI reference (UTR / transaction id): letters and digits only. */
export const UTR_PATTERN = /^[A-Z0-9]{10,22}$/;

export function normalizeUtr(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export function normalizeMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export interface TicketTier {
  name: string;
  price: number;
}

/** Tiers stored on an event, cleaned: named, with a price of zero or more. */
export function parseTiers(raw: unknown): TicketTier[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketTier[] = [];
  for (const t of raw) {
    const name = typeof t?.name === 'string' ? t.name.trim() : '';
    const price = Number(t?.price);
    if (name && Number.isFinite(price) && price >= 0) out.push({ name: name.slice(0, 60), price });
  }
  return out;
}

export interface PricedEvent {
  ticketType?: string | null;
  ticketPrice?: unknown;
  ticketTiers?: unknown;
}

/** What one ticket costs, or null when the event is free or the chosen tier does not exist. */
export function unitPriceFor(e: PricedEvent, tierName?: string | null): number | null {
  if (e.ticketType !== 'PAID') return null;
  const tiers = parseTiers(e.ticketTiers);
  if (tiers.length) {
    const t = tiers.find((x) => x.name.toLowerCase() === (tierName ?? '').trim().toLowerCase());
    return t ? t.price : null;
  }
  const p = Number(e.ticketPrice);
  return Number.isFinite(p) && p > 0 ? p : null;
}

/** True when the event charges for at least one ticket type. */
export function isPaidEvent(e: PricedEvent): boolean {
  if (e.ticketType !== 'PAID') return false;
  const tiers = parseTiers(e.ticketTiers);
  if (tiers.length) return tiers.some((t) => t.price > 0);
  return Number(e.ticketPrice) > 0;
}

export const rupees = (n: number | string) =>
  `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * UPI payment link. Opens the payer's UPI app with the host, amount and a note filled in, and is
 * what the on-the-fly QR code encodes when the host has not uploaded a photo of their own.
 */
export function upiPayUri(p: { upiId: string; payeeName: string; amount: number; note: string }) {
  // UPI apps read %20 for a space but not always "+", and expect the UPI ID with a plain "@".
  // (The ID was already checked against UPI_ID_PATTERN, so it holds only safe characters.)
  const enc = (v: string) => encodeURIComponent(v);
  return (
    `upi://pay?pa=${p.upiId}&pn=${enc(p.payeeName)}&am=${p.amount.toFixed(2)}` +
    `&cu=INR&tn=${enc(p.note.slice(0, 50))}`
  );
}
