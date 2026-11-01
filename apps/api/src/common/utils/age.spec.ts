import { MIN_SIGNUP_AGE, ageOn, dobProblem } from '@saas/types';

const NOW = new Date('2026-11-02T06:00:00.000Z'); // 2 Nov 2026, India morning

describe('date of birth at sign-up', () => {
  it('counts whole years, and a birthday that has not come yet does not count', () => {
    expect(ageOn('2013-11-02', NOW)).toBe(13); // 13th birthday is today
    expect(ageOn('2013-11-03', NOW)).toBe(12); // tomorrow
    expect(ageOn('1990-01-15', NOW)).toBe(36);
  });

  it('turns away anyone under 13 and says why', () => {
    expect(dobProblem('2013-11-03', NOW)).toMatch(/at least 13/);
    expect(dobProblem('2020-05-05', NOW)).toMatch(/at least 13/);
    expect(MIN_SIGNUP_AGE).toBe(13);
  });

  it('lets 13 and over through', () => {
    expect(dobProblem('2013-11-02', NOW)).toBeNull();
    expect(dobProblem('2001-04-23', NOW)).toBeNull();
  });

  it('rejects dates that are not real, not given, or not possible', () => {
    expect(dobProblem('', NOW)).toMatch(/Enter your date of birth/);
    expect(dobProblem(undefined, NOW)).toMatch(/Enter your date of birth/);
    expect(dobProblem('2010-02-31', NOW)).toMatch(/real date/);
    expect(dobProblem('23/04/2001', NOW)).toMatch(/real date/);
    expect(dobProblem('2030-01-01', NOW)).toMatch(/future/);
    expect(dobProblem('1850-01-01', NOW)).toMatch(/does not look right/);
  });
});
