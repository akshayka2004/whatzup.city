// ============================================================
// Reward rules. Pure functions, no database: how a spend window is cut, how far along a customer is,
// what a claim is called, when a code expires, and whether a reward's input and audience make sense.
// The services feed these with numbers from the database; the tests feed them numbers directly.
// ============================================================

import { BadRequestException } from '@nestjs/common';

export const SPEND_WINDOWS = ['SINCE_START', 'MONTHLY', 'ROLLING_30', 'LIFETIME'] as const;
export type SpendWindow = (typeof SPEND_WINDOWS)[number];

export const REWARD_TYPES = ['PERCENT', 'AMOUNT', 'FREEBIE'] as const;
export const CUSTOMER_TYPES = ['ANY', 'NEW', 'RETURNING', 'LAPSED'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const LIMITS = {
  thresholdMin: 1,
  thresholdMax: 1_000_000,
  maxProgramDays: 366,
  repeatDefaultCap: 10,
  repeatMaxCap: 50,
  claimValidMin: 3,
  claimValidMax: 90,
  claimValidDefault: 30,
  /** The "almost there" notice goes out from this share of the threshold. */
  nearAt: 0.8,
  /** An audience this small is not shown as a number: it would point at individuals. */
  minAudienceShown: 10,
};

const IST_OFFSET_MS = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;

/** India-time calendar day, "2026-11-25". */
export const istDay = (at: number | Date) =>
  new Date((typeof at === 'number' ? at : at.getTime()) + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Midnight at the start of this India-time month, as a Date. */
export function istMonthStart(at: number): Date {
  const d = new Date(at + IST_OFFSET_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - IST_OFFSET_MS);
}

export type WindowVoucher = { spendWindow?: string | null; startDate: Date | string };

/** The moment from which spend counts for this reward, or null for "all of it". */
export function windowStart(v: WindowVoucher, now: number): Date | null {
  switch (v.spendWindow) {
    case 'LIFETIME':
      return null;
    case 'MONTHLY':
      return istMonthStart(now);
    case 'ROLLING_30':
      return new Date(now - 30 * DAY_MS);
    case 'SINCE_START':
    default:
      return new Date(v.startDate);
  }
}

/** A label for the current window; goes into the claim's cycle key. */
export function windowKey(v: WindowVoucher, now: number): string {
  switch (v.spendWindow) {
    case 'LIFETIME':
      return 'all';
    case 'MONTHLY':
      return istDay(istMonthStart(now)).slice(0, 7);
    case 'ROLLING_30':
      // The window slides, so the day keeps two claims on different days from sharing a key.
      return `r${istDay(now)}`;
    case 'SINCE_START':
    default:
      return 'start';
  }
}

/** "start:0", "2026-11:2": which claim this would be. Two taps at once produce the same key, so one fails. */
export const cycleKey = (v: WindowVoucher, now: number, claimedInWindow: number) =>
  `${windowKey(v, now)}:${claimedInWindow}`;

export type CycleInput = {
  threshold: number;
  repeatable: boolean;
  /** Most claims in a window for a repeatable reward; ignored for a one-time reward. */
  cap?: number | null;
  spend: number;
  claimedInWindow: number;
};

export type CycleState = {
  /** Claims the customer can make right now. */
  claimable: number;
  /** 0..1 towards the next claim (1 when one is waiting). */
  progress: number;
  /** Rupees still to spend for the next claim (0 when one is waiting). */
  remaining: number;
  claimed: number;
  /** Nothing more can be claimed in this window. */
  done: boolean;
  /** Full thresholds reached so far (repeatable), or 0/1. */
  earned: number;
};

export function cycleState(i: CycleInput): CycleState {
  const threshold = Math.max(1, i.threshold);
  const spend = Math.max(0, i.spend);
  const claimed = Math.max(0, i.claimedInWindow);
  const cap = i.repeatable ? Math.min(i.cap ?? LIMITS.repeatDefaultCap, LIMITS.repeatMaxCap) : 1;
  const earnedRaw = i.repeatable ? Math.floor(spend / threshold) : spend >= threshold ? 1 : 0;
  const earned = Math.min(earnedRaw, cap);
  const claimable = Math.max(0, earned - claimed);
  const done = claimed >= cap;
  if (claimable > 0) {
    return { claimable, progress: 1, remaining: 0, claimed, done, earned };
  }
  if (done) {
    return { claimable: 0, progress: 1, remaining: 0, claimed, done, earned };
  }
  // Progress towards the next claim: the part of the spend that is not yet "used" by earlier claims.
  const intoNext = i.repeatable ? spend - claimed * threshold : spend;
  const remaining = Math.max(0, Math.round((threshold - intoNext) * 100) / 100);
  return {
    claimable: 0,
    progress: Math.max(0, Math.min(1, intoNext / threshold)),
    remaining,
    claimed,
    done,
    earned,
  };
}

/** Last moment a freshly claimed code works: not before the end date, and at least `claimValidDays` from now. */
export function claimExpiry(
  v: { endDate: Date | string; claimValidDays?: number | null },
  now: number,
): Date {
  const days = Math.min(
    LIMITS.claimValidMax,
    Math.max(LIMITS.claimValidMin, v.claimValidDays ?? LIMITS.claimValidDefault),
  );
  return new Date(Math.max(new Date(v.endDate).getTime(), now + days * DAY_MS));
}

/** Old claims have no expiry stored: they last until the end date plus two weeks. */
export function effectiveExpiry(
  claim: { expiresAt?: Date | string | null },
  voucher: { endDate: Date | string },
): Date {
  return claim.expiresAt
    ? new Date(claim.expiresAt)
    : new Date(new Date(voucher.endDate).getTime() + 14 * DAY_MS);
}

// ── audience ────────────────────────────────────────────────────────────────

export type Audience = {
  /** Spend in these categories (and their sub categories) counts. Empty = category does not matter. */
  categoryIds?: string[];
  /** Spent at least this much in those categories in `windowDays`. */
  minSpend?: number;
  windowDays?: number;
  /** Customer's city, or the city of a business they bought from. Empty = anywhere. */
  cities?: string[];
  customerType?: CustomerType;
  /** For LAPSED: no purchase at this business for this many days. */
  lapsedDays?: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/** Cleans whatever the client sent into a stored audience; unknown keys and bad values are dropped. {} = everyone. */
export function normalizeAudience(raw: unknown): Audience {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: Audience = {};
  const cats = Array.isArray(r.categoryIds)
    ? [...new Set(r.categoryIds.filter((c): c is string => typeof c === 'string' && UUID.test(c)))]
    : [];
  if (cats.length > 15) throw new BadRequestException('Pick up to 15 categories.');
  if (cats.length) {
    out.categoryIds = cats;
    out.minSpend = clampInt(r.minSpend, 0, LIMITS.thresholdMax, 0);
    out.windowDays = clampInt(r.windowDays, 7, 365, 60);
  }
  const cities = Array.isArray(r.cities)
    ? [
        ...new Set(
          r.cities
            .filter((c): c is string => typeof c === 'string')
            .map((c) => c.trim().slice(0, 100))
            .filter(Boolean),
        ),
      ]
    : [];
  if (cities.length > 20) throw new BadRequestException('Pick up to 20 cities.');
  if (cities.length) out.cities = cities;
  const type = String(r.customerType ?? 'ANY').toUpperCase();
  if ((CUSTOMER_TYPES as readonly string[]).includes(type) && type !== 'ANY') {
    out.customerType = type as CustomerType;
    if (type === 'LAPSED') out.lapsedDays = clampInt(r.lapsedDays, 14, 365, 60);
  }
  return out;
}

export const audienceIsSet = (a: Audience | null | undefined) =>
  !!a &&
  (!!a.categoryIds?.length || !!a.cities?.length || (!!a.customerType && a.customerType !== 'ANY'));

export type AudienceFacts = {
  /** Spend in the audience's categories inside its window. */
  categorySpend: number;
  /** Cities the person is tied to (their profile city, plus cities of businesses they bought from). */
  cities: string[];
  /** At this business: null = never bought, else the last verified purchase. */
  lastPurchaseHere: Date | null;
};

export function audienceMatches(
  a: Audience | null | undefined,
  f: AudienceFacts,
  now: number,
): boolean {
  if (!audienceIsSet(a)) return true;
  const aud = a as Audience;
  if (aud.categoryIds?.length && f.categorySpend < (aud.minSpend ?? 0)) return false;
  // minSpend 0 with categories still needs some spend in them, otherwise "cafe lovers" matches everyone.
  if (aud.categoryIds?.length && (aud.minSpend ?? 0) === 0 && f.categorySpend <= 0) return false;
  if (aud.cities?.length) {
    const want = aud.cities.map((c) => c.toLowerCase());
    if (!f.cities.some((c) => want.includes(c.toLowerCase()))) return false;
  }
  if (aud.customerType && aud.customerType !== 'ANY') {
    const last = f.lastPurchaseHere?.getTime() ?? null;
    if (aud.customerType === 'NEW' && last !== null) return false;
    if (
      aud.customerType === 'RETURNING' &&
      (last === null || now - last > (aud.lapsedDays ?? 60) * DAY_MS)
    ) {
      return false;
    }
    if (
      aud.customerType === 'LAPSED' &&
      (last === null || now - last <= (aud.lapsedDays ?? 60) * DAY_MS)
    ) {
      return false;
    }
  }
  return true;
}

/** A group this small is reported as "fewer than N", never as an exact number. */
export function shownAudienceCount(n: number): { count: number | null; label: string } {
  if (n < LIMITS.minAudienceShown)
    return { count: null, label: `Fewer than ${LIMITS.minAudienceShown} people` };
  return { count: n, label: `About ${n.toLocaleString('en-IN')} people` };
}

// ── input checks ────────────────────────────────────────────────────────────

export type VoucherInput = {
  title?: string;
  thresholdAmount?: number;
  rewardType?: string;
  rewardValue?: number | null;
  rewardLabel?: string | null;
  startDate?: string | Date;
  endDate?: string | Date;
  maxRedemptions?: number | null;
  spendWindow?: string;
  repeatable?: boolean;
  perCustomerLimit?: number | null;
  claimValidDays?: number;
  audience?: unknown;
};

/** Checks a reward the way a careful owner would expect: sensible money, sensible dates, a reward that says what it is. */
export function validateRewardInput(
  i: VoucherInput,
  opts: { creating: boolean; now?: number },
): void {
  const now = opts.now ?? Date.now();
  const bad = (m: string): never => {
    throw new BadRequestException(m);
  };
  if (opts.creating || i.title !== undefined) {
    const t = String(i.title ?? '').trim();
    if (t.length < 3) bad('Give the reward a short name, at least 3 letters.');
    if (t.length > 120) bad('Keep the reward name under 120 characters.');
  }
  if (opts.creating || i.thresholdAmount !== undefined) {
    const th = Number(i.thresholdAmount);
    if (!Number.isFinite(th) || th < LIMITS.thresholdMin || th > LIMITS.thresholdMax) {
      bad(
        `The spend needed must be between ₹${LIMITS.thresholdMin} and ₹${LIMITS.thresholdMax.toLocaleString('en-IN')}.`,
      );
    }
  }
  const type = i.rewardType ?? (opts.creating ? 'AMOUNT' : undefined);
  if (type !== undefined) {
    if (!(REWARD_TYPES as readonly string[]).includes(type))
      bad('Pick percent off, amount off or a free item.');
    if (type === 'PERCENT') {
      const v = Number(i.rewardValue);
      if (!Number.isFinite(v) || v <= 0 || v > 100)
        bad('A percent reward must be between 1 and 100.');
    }
    if (type === 'AMOUNT') {
      const v = Number(i.rewardValue);
      if (!Number.isFinite(v) || v <= 0) bad('An amount reward needs a rupee value above 0.');
    }
    if (type === 'FREEBIE' && !String(i.rewardLabel ?? '').trim()) {
      bad('Say what the free item is, for example "Free dessert".');
    }
  }
  if (
    i.spendWindow !== undefined &&
    !(SPEND_WINDOWS as readonly string[]).includes(i.spendWindow)
  ) {
    bad('Pick how spend is counted: since the start, this month, last 30 days or all time.');
  }
  if (i.repeatable && i.perCustomerLimit != null) {
    const n = Number(i.perCustomerLimit);
    if (!Number.isInteger(n) || n < 1 || n > LIMITS.repeatMaxCap) {
      bad(`One customer can claim between 1 and ${LIMITS.repeatMaxCap} times.`);
    }
  }
  if (i.claimValidDays !== undefined) {
    const n = Number(i.claimValidDays);
    if (!Number.isInteger(n) || n < LIMITS.claimValidMin || n > LIMITS.claimValidMax) {
      bad(`A code can stay valid for ${LIMITS.claimValidMin} to ${LIMITS.claimValidMax} days.`);
    }
  }
  if (
    i.maxRedemptions != null &&
    (!Number.isInteger(Number(i.maxRedemptions)) || Number(i.maxRedemptions) < 1)
  ) {
    bad('The reward limit must be a whole number, 1 or more.');
  }
  if (i.endDate !== undefined) {
    const end = new Date(i.endDate).getTime();
    if (Number.isNaN(end)) bad('Pick an end date.');
    const start = i.startDate !== undefined ? new Date(i.startDate).getTime() : now;
    if (Number.isNaN(start)) bad('Pick a start date.');
    if (end <= start) bad('The end date must be after the start date.');
    if (opts.creating && end < now) bad('The end date has already passed.');
    if (end - start > LIMITS.maxProgramDays * DAY_MS) {
      bad(`A reward can run for up to ${LIMITS.maxProgramDays} days. You can extend it later.`);
    }
  }
  if (i.audience !== undefined) normalizeAudience(i.audience);
}

/** What stays fixed once any customer has claimed: changing it would change what they were promised. */
export const LOCKED_AFTER_CLAIM = [
  'thresholdAmount',
  'spendWindow',
  'repeatable',
  'audience',
  'startDate',
  'rewardType',
  'rewardValue',
] as const;
