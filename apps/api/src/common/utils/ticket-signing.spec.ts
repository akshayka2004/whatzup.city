import { randomUUID } from 'crypto';
import {
  crewCodeFor,
  crewToken,
  formatCrewCode,
  hashCrewCode,
  normalizeCrewCode,
  parseCrewToken,
  parseTicketQr,
  ticketQr,
} from './ticket-signing';

describe('ticket QR', () => {
  it('round-trips a genuine ticket', () => {
    const id = randomUUID();
    expect(parseTicketQr(ticketQr(id))).toBe(id);
    expect(parseTicketQr(`  ${ticketQr(id)}\n`)).toBe(id);
  });

  it('rejects forged, edited and foreign text', () => {
    const id = randomUUID();
    const good = ticketQr(id);
    expect(parseTicketQr(good.slice(0, -1) + (good.endsWith('A') ? 'B' : 'A'))).toBeNull();
    expect(parseTicketQr(good.replace(id, randomUUID()))).toBeNull();
    expect(parseTicketQr(`T1.${id}.${'A'.repeat(22)}`)).toBeNull();
    for (const junk of ['', 'hello', 'https://platform.whtzup.city/b/K7M3Q9', 'T2.x.y']) {
      expect(parseTicketQr(junk)).toBeNull();
    }
  });

  it('is signed with the secret: another secret rejects it', () => {
    const id = randomUUID();
    const qr = ticketQr(id);
    process.env.TICKET_SIGNING_SECRET = 'another-secret';
    try {
      expect(parseTicketQr(qr)).toBeNull();
    } finally {
      delete process.env.TICKET_SIGNING_SECRET;
    }
  });

  it('carries no personal data', () => {
    expect(ticketQr(randomUUID())).toMatch(/^T1\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{22}$/);
  });
});

describe('crew codes', () => {
  it('derives the same readable 8-character code for a pass every time', () => {
    const id = randomUUID();
    const code = crewCodeFor(id);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(crewCodeFor(id)).toBe(code);
    expect(crewCodeFor(randomUUID())).not.toBe(code);
  });

  it('accepts what people type', () => {
    const code = crewCodeFor(randomUUID());
    expect(normalizeCrewCode(formatCrewCode(code).toLowerCase())).toBe(code);
    expect(normalizeCrewCode(` ${code.slice(0, 4)} ${code.slice(4)} `)).toBe(code);
    for (const bad of ['', 'ABC', 'ABCD-EFG0', 'ABCDEFGHI', null, 5]) {
      expect(normalizeCrewCode(bad)).toBeNull();
    }
  });

  it('stores only a hash that changes with the code', () => {
    const a = crewCodeFor(randomUUID());
    expect(hashCrewCode(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCrewCode(a)).not.toBe(hashCrewCode(crewCodeFor(randomUUID())));
    expect(hashCrewCode(a)).not.toContain(a);
  });
});

describe('crew session token', () => {
  it('round-trips and rejects tampering', () => {
    const id = randomUUID();
    const token = crewToken(id);
    expect(parseCrewToken(token)).toBe(id);
    expect(parseCrewToken(token.replace(id, randomUUID()))).toBeNull();
    expect(parseCrewToken(ticketQr(id))).toBeNull();
    expect(parseCrewToken(undefined)).toBeNull();
  });
});
