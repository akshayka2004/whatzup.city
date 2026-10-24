import * as crypto from 'crypto';
import { isValidRazorpaySignature } from './webhook-signature';

describe('isValidRazorpaySignature', () => {
  const secret = 'whsec_test';
  const body = Buffer.from('{"event":"payment.captured"}');
  const good = crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('accepts the exact body signed with the secret', () => {
    expect(isValidRazorpaySignature(body, good, secret)).toBe(true);
  });
  it('rejects a changed body, a wrong signature, or a missing secret', () => {
    expect(isValidRazorpaySignature(Buffer.from('{"event":"x"}'), good, secret)).toBe(false);
    expect(isValidRazorpaySignature(body, 'deadbeef', secret)).toBe(false);
    expect(isValidRazorpaySignature(body, good, undefined)).toBe(false);
  });
});
