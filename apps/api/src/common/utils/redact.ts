/**
 * Strip secrets and identity documents before anything is logged.
 *
 * Logs get shipped, tailed and pasted into tickets, so they must never carry
 * passwords, tokens or PAN/GSTIN. Applied to audit metadata and error payloads.
 */

const SENSITIVE_KEYS = [
  'password', 'passwordhash', 'newpassword', 'currentpassword', 'confirmpassword',
  'token', 'accesstoken', 'refreshtoken', 'authorization', 'cookie',
  'secret', 'apikey', 'api_key', 'servicerolekey', 'encryptionkey',
  'pan', 'gstin', 'gst', 'aadhaar', 'aadhar',
  'cvv', 'cardnumber', 'accountnumber', 'ifsc',
  'otp', 'pin',
];

const REDACTED = '[REDACTED]';

function isSensitive(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z]/g, '');
  return SENSITIVE_KEYS.some((s) => k === s || k.includes(s));
}

/**
 * Deep-clone with sensitive values replaced. Depth-capped so a cyclic or very
 * deep object can't hang the logger.
 */
export function redact<T>(value: T, depth = 0): T {
  if (depth > 6 || value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1)) as unknown as T;
  }

  if (typeof value === 'object') {
    // Don't try to walk Dates, Buffers etc.
    if (value instanceof Date || Buffer.isBuffer(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitive(k) ? REDACTED : redact(v, depth + 1);
    }
    return out as unknown as T;
  }

  return value;
}
