import * as crypto from 'crypto';

/**
 * Razorpay signs the exact request body with the webhook secret
 * (HMAC-SHA256, hex) in x-razorpay-signature. Constant-time compare.
 */
export function isValidRazorpaySignature(
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
