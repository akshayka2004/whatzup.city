import { bucketKey, dayKeys, istDateKey, istDayStart, istRange, pctChange, previousRange } from './ist';

describe('IST helpers', () => {
  it('assigns late-evening UTC to the next IST day', () => {
    // 2026-10-05 18:40 UTC = 2026-10-06 00:10 IST
    expect(istDateKey(new Date('2026-10-05T18:40:00Z'))).toBe('2026-10-06');
    // 2026-10-05 18:29 UTC = 2026-10-05 23:59 IST
    expect(istDateKey(new Date('2026-10-05T18:29:59Z'))).toBe('2026-10-05');
  });

  it('starts an IST day at 18:30 UTC of the previous date', () => {
    expect(istDayStart('2026-10-06').toISOString()).toBe('2026-10-05T18:30:00.000Z');
  });

  it('builds a half-open N-day range ending today', () => {
    const r = istRange({ days: 7, now: new Date('2026-10-08T05:00:00Z') });
    expect(r.from).toBe('2026-10-02');
    expect(r.to).toBe('2026-10-08');
    expect(r.days).toBe(7);
    expect(r.start.toISOString()).toBe('2026-10-01T18:30:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-08T18:30:00.000Z');
    expect(dayKeys(r)).toHaveLength(7);
  });

  it('respects explicit from/to and caps long spans', () => {
    const r = istRange({ from: '2026-01-01', to: '2026-01-31' });
    expect(r.days).toBe(31);
    const capped = istRange({ from: '2020-01-01', to: '2026-01-01', maxDays: 90 });
    expect(capped.days).toBe(90);
  });

  it('computes the previous equal window', () => {
    const r = istRange({ from: '2026-10-01', to: '2026-10-07' });
    const p = previousRange(r);
    expect(p.from).toBe('2026-09-24');
    expect(p.to).toBe('2026-09-30');
    expect(p.end.getTime()).toBe(r.start.getTime());
  });

  it('buckets weeks from Monday and months from the 1st', () => {
    expect(bucketKey('2026-10-08', 'week')).toBe('2026-10-05'); // Thu → Mon
    expect(bucketKey('2026-10-05', 'week')).toBe('2026-10-05');
    expect(bucketKey('2026-10-11', 'week')).toBe('2026-10-05'); // Sun → Mon
    expect(bucketKey('2026-10-08', 'month')).toBe('2026-10-01');
  });

  it('handles zero baselines in % change', () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(5, 10)).toBe(-50);
  });
});
