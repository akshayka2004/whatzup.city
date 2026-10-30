import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PUBLIC_CODE_ALPHABET } from './public-code';

/**
 * Signed values for event tickets and crew passes. Everything is derived from one server secret,
 * so a QR cannot be forged and the database never holds a crew code in clear text.
 * TICKET_SIGNING_SECRET should be set in production; it falls back to JWT_SECRET.
 */
function secret(): string {
  return process.env.TICKET_SIGNING_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me';
}

const mac = (message: string): Buffer => createHmac('sha256', secret()).update(message).digest();
const b64 = (buf: Buffer) => buf.toString('base64url');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sameSignature(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── ticket QR: T1.<ticket id>.<signature> ────────────────────────────────

const ticketSig = (ticketId: string) => b64(mac(`ticket:${ticketId}`)).slice(0, 22);

/** What the ticket's QR encodes. Carries no personal data. */
export function ticketQr(ticketId: string): string {
  return `T1.${ticketId}.${ticketSig(ticketId)}`;
}

/** The ticket id inside a scanned QR, or null when it is not a genuine ticket. */
export function parseTicketQr(text: string): string | null {
  const m = /^T1\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{22})$/i.exec((text ?? '').trim());
  if (!m || !UUID_RE.test(m[1])) return null;
  const id = m[1].toLowerCase();
  return sameSignature(m[2], ticketSig(id)) ? id : null;
}

// ── crew pass codes: 8 characters, shown as ABCD-EFGH ────────────────────

/** The login code for a pass. Same pass id and secret always give the same code. */
export function crewCodeFor(passId: string): string {
  const bytes = mac(`crew:${passId}`);
  let out = '';
  for (let i = 0; i < 8; i++) out += PUBLIC_CODE_ALPHABET[bytes[i] % PUBLIC_CODE_ALPHABET.length];
  return out;
}

/** Cleans what someone typed (spaces, hyphens, lower case); null if it cannot be a code. */
export function normalizeCrewCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.replace(/[\s-]/g, '').toUpperCase();
  return new RegExp(`^[${PUBLIC_CODE_ALPHABET}]{8}$`).test(code) ? code : null;
}

export const hashCrewCode = (code: string): string =>
  createHash('sha256').update(`crewcode:${code}`).digest('hex');

export const formatCrewCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

// ── crew session token: C1.<session id>.<signature> ──────────────────────

const sessionSig = (sessionId: string) => b64(mac(`crew-session:${sessionId}`)).slice(0, 22);

export function crewToken(sessionId: string): string {
  return `C1.${sessionId}.${sessionSig(sessionId)}`;
}

export function parseCrewToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const m = /^C1\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{22})$/i.exec(token.trim());
  if (!m || !UUID_RE.test(m[1])) return null;
  const id = m[1].toLowerCase();
  return sameSignature(m[2], sessionSig(id)) ? id : null;
}
