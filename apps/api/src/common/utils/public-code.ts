import { randomInt } from 'crypto';

/**
 * Short permanent code printed inside business QR codes (platform.whtzup.city/b/K7M3Q9).
 * No I, L, O, 0 or 1, so a code read aloud or typed by hand is not misread.
 */
export const PUBLIC_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const PUBLIC_CODE_LENGTH = 6;

export function generatePublicCode(length = PUBLIC_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++)
    out += PUBLIC_CODE_ALPHABET[randomInt(PUBLIC_CODE_ALPHABET.length)];
  return out;
}

/** Upper-cases and checks a code from a URL; null when it cannot be one of ours. */
export function normalizePublicCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  return new RegExp(`^[${PUBLIC_CODE_ALPHABET}]{4,12}$`).test(code) ? code : null;
}
