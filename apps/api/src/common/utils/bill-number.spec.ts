import { normalizeBillNumber, billNumberMatchesSeries } from './bill-number';

describe('normalizeBillNumber', () => {
  it('drops whitespace and upper-cases', () => {
    expect(normalizeBillNumber(' sc / 2026 / 001 ')).toBe('SC/2026/001');
    expect(normalizeBillNumber('inv-0042')).toBe('INV-0042');
  });
  it('returns null for empty or non-strings', () => {
    expect(normalizeBillNumber('   ')).toBeNull();
    expect(normalizeBillNumber(undefined)).toBeNull();
    expect(normalizeBillNumber(null)).toBeNull();
    expect(normalizeBillNumber(42 as any)).toBeNull();
  });
});

describe('billNumberMatchesSeries', () => {
  it('matches a typed number against a slash-style prefix, ignoring case and spaces', () => {
    expect(billNumberMatchesSeries('SC/2026/', 'sc/2026/117')).toBe(true);
    expect(billNumberMatchesSeries('sc / 2026 /', 'SC/2026/117')).toBe(true);
  });
  it('does not match another series or missing data', () => {
    expect(billNumberMatchesSeries('SC/2026/', 'XY/2026/117')).toBe(false);
    expect(billNumberMatchesSeries(null, 'SC/2026/1')).toBe(false);
    expect(billNumberMatchesSeries('SC/', null)).toBe(false);
  });
});
