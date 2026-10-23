/**
 * Reduces any way of writing an Indian mobile number ("98765 43210", "+91 98765-43210",
 * "09876543210") to its 10 digits, or null when it is not a valid mobile number.
 */
export function normalizeIndianMobile(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
