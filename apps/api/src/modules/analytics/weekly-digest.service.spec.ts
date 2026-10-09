import { digestText, weekStartKey } from './weekly-digest.service';

describe('weekStartKey', () => {
  it('returns the Monday of the IST week', () => {
    expect(weekStartKey('2026-10-08')).toBe('2026-10-05'); // Thursday
    expect(weekStartKey('2026-10-05')).toBe('2026-10-05'); // Monday
    expect(weekStartKey('2026-10-11')).toBe('2026-10-05'); // Sunday
  });
});

describe('digestText', () => {
  const zero = { views: 0, actions: 0, claims: 0, verifiedBills: 0, verifiedSpend: 0 };

  it('reports week-on-week change and pluralises', () => {
    const { title, body } = digestText('1940', { views: 1200, actions: 1, claims: 3, verifiedBills: 2, verifiedSpend: 4500 }, { views: 1000, actions: 2, claims: 3, verifiedBills: 0, verifiedSpend: 0 });
    expect(title).toBe('1940: your week on Whtzup.city');
    expect(body).toContain('1,200 profile views (▲ 20%)');
    expect(body).toContain('1 call/direction/WhatsApp tap (▼ 50%)');
    expect(body).toContain('3 offer claims (same as last week)');
    expect(body).toContain('₹4,500 verified spend across 2 bills');
  });

  it('marks first-week numbers as new and hides empty sections', () => {
    const { body } = digestText('Cafe', { ...zero, views: 5 }, zero);
    expect(body).toBe('Last week: 5 profile views (new), 0 call/direction/WhatsApp taps.');
  });
});
