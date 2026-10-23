import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  otpauthUrl,
  verifyTotp,
} from './totp';

// RFC 6238 Appendix B (SHA-1 seed "12345678901234567890"), truncated to 6 digits.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const VECTORS: Array<[number, string]> = [
  [59, '287082'],
  [1111111109, '081804'],
  [1111111111, '050471'],
  [1234567890, '005924'],
  [2000000000, '279037'],
];

describe('totp', () => {
  it('round-trips base32', () => {
    const buf = Buffer.from('any bytes \u00ff\u0000', 'latin1');
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
  });

  it.each(VECTORS)('matches RFC 6238 at t=%i', (t, code) => {
    expect(hotp(base32Decode(RFC_SECRET), Math.floor(t / 30))).toBe(code);
    expect(verifyTotp(RFC_SECRET, code, t * 1000, 0)).toBe(Math.floor(t / 30));
  });

  it('accepts the adjacent step for clock drift and rejects older codes', () => {
    const t = 1234567890 * 1000;
    expect(verifyTotp(RFC_SECRET, '005924', t + 30_000)).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, '005924', t + 90_000)).toBeNull();
  });

  it('rejects malformed codes', () => {
    expect(verifyTotp(RFC_SECRET, '12345')).toBeNull();
    expect(verifyTotp(RFC_SECRET, 'abcdef')).toBeNull();
  });

  it('generates 32-char secrets and a standard otpauth URL', () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    const url = otpauthUrl(s, 'admin@example.test', 'whtzup.city');
    expect(url.startsWith('otpauth://totp/whtzup.city%3Aadmin%40example.test?')).toBe(true);
    expect(url).toContain(`secret=${s}`);
  });
});
