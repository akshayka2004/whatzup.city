import { BadRequestException } from '@nestjs/common';
import {
  LIMITS,
  audienceIsSet,
  audienceMatches,
  claimExpiry,
  cycleKey,
  cycleState,
  effectiveExpiry,
  normalizeAudience,
  shownAudienceCount,
  validateRewardInput,
  windowKey,
  windowStart,
} from './reward-rules';

const DAY = 86_400_000;
// 25 Nov 2026, 10:00 India time.
const NOW = Date.parse('2026-11-25T04:30:00Z');
const START = new Date('2026-11-10T00:00:00Z');

describe('the spend window', () => {
  it('SINCE_START counts from the start date, so old spend does not unlock a new reward', () => {
    expect(windowStart({ spendWindow: 'SINCE_START', startDate: START }, NOW)).toEqual(START);
  });
  it('LIFETIME counts everything (how old rewards keep working)', () => {
    expect(windowStart({ spendWindow: 'LIFETIME', startDate: START }, NOW)).toBeNull();
  });
  it('MONTHLY starts at midnight India time on the 1st', () => {
    const from = windowStart({ spendWindow: 'MONTHLY', startDate: START }, NOW)!;
    expect(from.toISOString()).toBe('2026-10-31T18:30:00.000Z');
  });
  it('MONTHLY near midnight uses India time, not UTC', () => {
    // 30 Nov 20:00 UTC is already 1 Dec in India.
    const late = Date.parse('2026-11-30T20:00:00Z');
    expect(windowStart({ spendWindow: 'MONTHLY', startDate: START }, late)!.toISOString()).toBe(
      '2026-11-30T18:30:00.000Z',
    );
    expect(windowKey({ spendWindow: 'MONTHLY', startDate: START }, late)).toBe('2026-12');
  });
  it('ROLLING_30 is the last 30 days', () => {
    expect(windowStart({ spendWindow: 'ROLLING_30', startDate: START }, NOW)!.getTime()).toBe(
      NOW - 30 * DAY,
    );
  });
  it('an unknown or missing window falls back to since-start', () => {
    expect(windowStart({ spendWindow: undefined, startDate: START }, NOW)).toEqual(START);
  });
  it('claim keys differ by window and by claim number', () => {
    const v = { spendWindow: 'SINCE_START', startDate: START };
    expect(cycleKey(v, NOW, 0)).toBe('start:0');
    expect(cycleKey(v, NOW, 2)).toBe('start:2');
    expect(cycleKey({ spendWindow: 'MONTHLY', startDate: START }, NOW, 0)).toBe('2026-11:0');
    expect(cycleKey({ spendWindow: 'LIFETIME', startDate: START }, NOW, 1)).toBe('all:1');
    expect(cycleKey({ spendWindow: 'ROLLING_30', startDate: START }, NOW, 0)).toBe('r2026-11-25:0');
  });
});

describe('progress towards a reward', () => {
  it('one-time: below the level shows progress and what is left', () => {
    const s = cycleState({ threshold: 1000, repeatable: false, spend: 250, claimedInWindow: 0 });
    expect(s).toMatchObject({ claimable: 0, progress: 0.25, remaining: 750, done: false });
  });
  it('one-time: at the level it becomes claimable, once', () => {
    expect(
      cycleState({ threshold: 1000, repeatable: false, spend: 1000, claimedInWindow: 0 }),
    ).toMatchObject({
      claimable: 1,
      progress: 1,
      remaining: 0,
    });
    expect(
      cycleState({ threshold: 1000, repeatable: false, spend: 5000, claimedInWindow: 1 }),
    ).toMatchObject({
      claimable: 0,
      done: true,
    });
  });
  it('repeatable: every full level can be claimed, the rest carries over', () => {
    const s = cycleState({ threshold: 1000, repeatable: true, spend: 2300, claimedInWindow: 0 });
    expect(s.claimable).toBe(2);
    const after = cycleState({
      threshold: 1000,
      repeatable: true,
      spend: 2300,
      claimedInWindow: 2,
    });
    expect(after).toMatchObject({ claimable: 0, remaining: 700, done: false });
    expect(after.progress).toBeCloseTo(0.3, 5);
  });
  it('repeatable: stops at the per-customer limit', () => {
    const s = cycleState({
      threshold: 100,
      repeatable: true,
      cap: 3,
      spend: 10_000,
      claimedInWindow: 1,
    });
    expect(s.claimable).toBe(2);
    expect(
      cycleState({ threshold: 100, repeatable: true, cap: 3, spend: 10_000, claimedInWindow: 3 }),
    ).toMatchObject({
      claimable: 0,
      done: true,
    });
  });
  it('repeatable without a limit still has a sane ceiling', () => {
    const s = cycleState({ threshold: 1, repeatable: true, spend: 1_000_000, claimedInWindow: 0 });
    expect(s.claimable).toBe(LIMITS.repeatDefaultCap);
  });
  it('bad numbers do not break it', () => {
    expect(
      cycleState({ threshold: 0, repeatable: false, spend: -5, claimedInWindow: -1 }),
    ).toMatchObject({
      claimable: 0,
    });
  });
});

describe('how long a claimed code lasts', () => {
  it('never less than the end date, and at least the days the reward allows', () => {
    const endSoon = new Date(NOW + 2 * DAY);
    expect(claimExpiry({ endDate: endSoon, claimValidDays: 30 }, NOW).getTime()).toBe(
      NOW + 30 * DAY,
    );
    const endLate = new Date(NOW + 90 * DAY);
    expect(claimExpiry({ endDate: endLate, claimValidDays: 30 }, NOW).getTime()).toBe(
      endLate.getTime(),
    );
  });
  it('keeps the days inside the allowed range', () => {
    expect(claimExpiry({ endDate: new Date(NOW), claimValidDays: 1 }, NOW).getTime()).toBe(
      NOW + LIMITS.claimValidMin * DAY,
    );
    expect(claimExpiry({ endDate: new Date(NOW), claimValidDays: 999 }, NOW).getTime()).toBe(
      NOW + LIMITS.claimValidMax * DAY,
    );
  });
  it('old claims with no expiry last until two weeks after the end date', () => {
    const end = new Date(NOW + 5 * DAY);
    expect(effectiveExpiry({ expiresAt: null }, { endDate: end }).getTime()).toBe(
      end.getTime() + 14 * DAY,
    );
    const own = new Date(NOW + DAY);
    expect(effectiveExpiry({ expiresAt: own }, { endDate: end }).getTime()).toBe(own.getTime());
  });
});

describe('audiences', () => {
  const cafe = '11111111-1111-4111-8111-111111111111';
  it('nothing set means everyone', () => {
    expect(normalizeAudience(undefined)).toEqual({});
    expect(normalizeAudience({})).toEqual({});
    expect(audienceIsSet({})).toBe(false);
    expect(audienceMatches({}, { categorySpend: 0, cities: [], lastPurchaseHere: null }, NOW)).toBe(
      true,
    );
  });
  it('cleans what the client sent and drops junk', () => {
    const a = normalizeAudience({
      categoryIds: [cafe, cafe, 'not-an-id', 42],
      minSpend: '3000',
      windowDays: 9999,
      cities: [' Kochi ', 'Kochi', ''],
      customerType: 'lapsed',
      evil: '<script>',
    });
    expect(a).toEqual({
      categoryIds: [cafe],
      minSpend: 3000,
      windowDays: 365,
      cities: ['Kochi', 'Kochi'].slice(0, 1),
      customerType: 'LAPSED',
      lapsedDays: 60,
    });
    expect((a as any).evil).toBeUndefined();
  });
  it('limits how many categories and cities', () => {
    const many = Array.from(
      { length: 16 },
      (_, i) => `11111111-1111-4111-8111-${String(i).padStart(12, '0')}`,
    );
    expect(() => normalizeAudience({ categoryIds: many })).toThrow(BadRequestException);
    expect(() =>
      normalizeAudience({ cities: Array.from({ length: 21 }, (_, i) => `City${i}`) }),
    ).toThrow(BadRequestException);
  });
  it('category spend must reach the minimum, and categories with no minimum still need some spend', () => {
    const a = normalizeAudience({ categoryIds: [cafe], minSpend: 3000 });
    expect(
      audienceMatches(a, { categorySpend: 2999, cities: [], lastPurchaseHere: null }, NOW),
    ).toBe(false);
    expect(
      audienceMatches(a, { categorySpend: 3000, cities: [], lastPurchaseHere: null }, NOW),
    ).toBe(true);
    const any = normalizeAudience({ categoryIds: [cafe] });
    expect(
      audienceMatches(any, { categorySpend: 0, cities: [], lastPurchaseHere: null }, NOW),
    ).toBe(false);
    expect(
      audienceMatches(any, { categorySpend: 1, cities: [], lastPurchaseHere: null }, NOW),
    ).toBe(true);
  });
  it('city matches ignoring case, from any city the person is tied to', () => {
    const a = normalizeAudience({ cities: ['Kochi'] });
    expect(
      audienceMatches(
        a,
        { categorySpend: 0, cities: ['kozhikode', 'KOCHI'], lastPurchaseHere: null },
        NOW,
      ),
    ).toBe(true);
    expect(
      audienceMatches(a, { categorySpend: 0, cities: ['Kollam'], lastPurchaseHere: null }, NOW),
    ).toBe(false);
    expect(audienceMatches(a, { categorySpend: 0, cities: [], lastPurchaseHere: null }, NOW)).toBe(
      false,
    );
  });
  it('new, returning and lapsed customers of this business', () => {
    const recent = new Date(NOW - 10 * DAY);
    const old = new Date(NOW - 120 * DAY);
    const f = (last: Date | null) => ({ categorySpend: 0, cities: [], lastPurchaseHere: last });
    const isNew = normalizeAudience({ customerType: 'NEW' });
    expect(audienceMatches(isNew, f(null), NOW)).toBe(true);
    expect(audienceMatches(isNew, f(recent), NOW)).toBe(false);
    const returning = normalizeAudience({ customerType: 'RETURNING' });
    expect(audienceMatches(returning, f(recent), NOW)).toBe(true);
    expect(audienceMatches(returning, f(old), NOW)).toBe(false);
    expect(audienceMatches(returning, f(null), NOW)).toBe(false);
    const lapsed = normalizeAudience({ customerType: 'LAPSED', lapsedDays: 60 });
    expect(audienceMatches(lapsed, f(old), NOW)).toBe(true);
    expect(audienceMatches(lapsed, f(recent), NOW)).toBe(false);
    expect(audienceMatches(lapsed, f(null), NOW)).toBe(false);
  });
  it('every rule has to hold together', () => {
    const a = normalizeAudience({
      categoryIds: [cafe],
      minSpend: 1000,
      cities: ['Kochi'],
      customerType: 'NEW',
    });
    expect(
      audienceMatches(a, { categorySpend: 1500, cities: ['Kochi'], lastPurchaseHere: null }, NOW),
    ).toBe(true);
    expect(
      audienceMatches(
        a,
        { categorySpend: 1500, cities: ['Kochi'], lastPurchaseHere: new Date(NOW) },
        NOW,
      ),
    ).toBe(false);
    expect(
      audienceMatches(a, { categorySpend: 500, cities: ['Kochi'], lastPurchaseHere: null }, NOW),
    ).toBe(false);
  });
  it('a small audience is never shown as an exact number', () => {
    expect(shownAudienceCount(3)).toEqual({ count: null, label: 'Fewer than 10 people' });
    expect(shownAudienceCount(0).count).toBeNull();
    expect(shownAudienceCount(10)).toMatchObject({ count: 10 });
    expect(shownAudienceCount(1250).label).toBe('About 1,250 people');
  });
});

describe('checking a reward before it is saved', () => {
  const ok = {
    title: 'Free dessert',
    thresholdAmount: 1000,
    rewardType: 'FREEBIE',
    rewardLabel: 'Free dessert',
    startDate: new Date(NOW).toISOString(),
    endDate: new Date(NOW + 30 * DAY).toISOString(),
  };
  const check = (over: any = {}, creating = true) =>
    validateRewardInput({ ...ok, ...over }, { creating, now: NOW });

  it('accepts a normal reward', () => {
    expect(() => check()).not.toThrow();
  });
  it('needs a name', () => {
    expect(() => check({ title: ' a ' })).toThrow(/short name/);
    expect(() => check({ title: 'x'.repeat(121) })).toThrow(/under 120/);
  });
  it('keeps the spend level in range', () => {
    expect(() => check({ thresholdAmount: 0 })).toThrow(/between/);
    expect(() => check({ thresholdAmount: 2_000_000 })).toThrow(/between/);
    expect(() => check({ thresholdAmount: 'abc' as any })).toThrow(/between/);
  });
  it('percent must be 1 to 100, amount above 0, a free item needs a name', () => {
    expect(() => check({ rewardType: 'PERCENT', rewardValue: 0 })).toThrow(/between 1 and 100/);
    expect(() => check({ rewardType: 'PERCENT', rewardValue: 150 })).toThrow(/between 1 and 100/);
    expect(() => check({ rewardType: 'PERCENT', rewardValue: 10 })).not.toThrow();
    expect(() => check({ rewardType: 'AMOUNT', rewardValue: -5 })).toThrow(/above 0/);
    expect(() => check({ rewardType: 'AMOUNT' })).toThrow(/above 0/);
    expect(() => check({ rewardType: 'AMOUNT', rewardValue: 100 })).not.toThrow();
    expect(() => check({ rewardType: 'FREEBIE', rewardLabel: '  ' })).toThrow(/free item/);
  });
  it('dates make sense', () => {
    expect(() =>
      check({
        endDate: new Date(NOW - DAY).toISOString(),
        startDate: new Date(NOW - 5 * DAY).toISOString(),
      }),
    ).toThrow(/already passed/);
    expect(() => check({ endDate: ok.startDate })).toThrow(/after the start/);
    expect(() => check({ endDate: new Date(NOW + 400 * DAY).toISOString() })).toThrow(
      /up to 366 days/,
    );
    expect(() => check({ endDate: 'soon' })).toThrow(/end date/);
  });
  it('an edit may keep an end date that has passed only if it is not being created', () => {
    expect(() =>
      check(
        {
          endDate: new Date(NOW - DAY).toISOString(),
          startDate: new Date(NOW - 5 * DAY).toISOString(),
        },
        false,
      ),
    ).not.toThrow();
  });
  it('limits and windows', () => {
    expect(() => check({ spendWindow: 'FOREVER' })).toThrow(/how spend is counted/);
    expect(() => check({ repeatable: true, perCustomerLimit: 0 })).toThrow(/between 1 and 50/);
    expect(() => check({ repeatable: true, perCustomerLimit: 5 })).not.toThrow();
    expect(() => check({ claimValidDays: 1 })).toThrow(/3 to 90 days/);
    expect(() => check({ maxRedemptions: 0 })).toThrow(/whole number/);
    expect(() => check({ maxRedemptions: 2.5 })).toThrow(/whole number/);
  });
  it('a partial edit only checks what it changes', () => {
    expect(() => validateRewardInput({ maxRedemptions: 50 }, { creating: false })).not.toThrow();
    expect(() => validateRewardInput({ title: '' }, { creating: false })).toThrow(/short name/);
  });
});
