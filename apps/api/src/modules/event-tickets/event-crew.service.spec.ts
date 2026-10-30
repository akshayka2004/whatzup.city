import { randomUUID } from 'crypto';
import { crewCodeFor, formatCrewCode, hashCrewCode } from '../../common/utils/ticket-signing';
import { EventCrewService } from './event-crew.service';

const HOUR = 3_600_000;
const host = { id: 'host1', role: 'BUSINESS_OWNER' };

function world(over: { pass?: Record<string, any>; event?: Record<string, any> } = {}) {
  const event: any = {
    id: 'ev1',
    tenantId: 't1',
    title: 'Open Mic Night',
    status: 'ACTIVE',
    deletedAt: null,
    venue: 'Town Hall',
    businessId: 'b1',
    startDate: new Date(Date.now() + HOUR),
    endDate: new Date(Date.now() + 4 * HOUR),
    checkInOpensAt: null,
    checkInClosesAt: null,
    ...over.event,
  };
  const passes: any[] = [];
  const sessions: any[] = [];
  const addPass = (o: Record<string, any> = {}) => {
    const id = randomUUID();
    const p = {
      id,
      tenantId: 't1',
      eventId: 'ev1',
      label: 'Gate 1',
      codeHash: hashCrewCode(crewCodeFor(id)),
      level: 'SCAN',
      validFrom: new Date(Date.now() - HOUR),
      validUntil: new Date(Date.now() + 5 * HOUR),
      maxDevices: 2,
      revokedAt: null,
      lastUsedAt: null,
      ...o,
    };
    passes.push(p);
    return p;
  };

  const db: any = {
    event: { findFirst: jest.fn(async () => ({ ...event })) },
    business: {
      findFirst: jest.fn(async () => ({
        id: 'b1',
        tenantId: 't1',
        ownerId: 'host1',
        brand: null,
        staff: [],
      })),
    },
    eventCrewPass: {
      count: jest.fn(async () => passes.filter((p) => !p.revokedAt).length),
      create: jest.fn(async ({ data }: any) => {
        const p = { revokedAt: null, lastUsedAt: null, ...data };
        passes.push(p);
        return p;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const p = passes.find((x) => x.codeHash === where.codeHash);
        return p ? { ...p, event: { ...event } } : null;
      }),
      update: jest.fn(async ({ where, data }: any) =>
        Object.assign(
          passes.find((p) => p.id === where.id),
          data,
        ),
      ),
      findMany: jest.fn(async () =>
        passes.map((p) => ({
          ...p,
          sessions: sessions.filter((s) => s.passId === p.id && !s.endedAt),
        })),
      ),
      findFirst: jest.fn(async ({ where }: any) => {
        const p = passes.find((x) => x.id === where.id && x.eventId === where.eventId);
        return p ? { ...p, sessions: sessions.filter((s) => s.passId === p.id) } : null;
      }),
    },
    eventCrewSession: {
      findMany: jest.fn(async ({ where }: any) =>
        sessions.filter((s) => s.passId === where.passId),
      ),
      create: jest.fn(async ({ data }: any) => {
        const s = { id: randomUUID(), endedAt: null, ...data };
        sessions.push(s);
        return s;
      }),
      update: jest.fn(async ({ where, data }: any) =>
        Object.assign(
          sessions.find((s) => s.id === where.id),
          data,
        ),
      ),
      updateMany: jest.fn(async ({ where, data }: any) => {
        sessions
          .filter((s) => s.passId === where.passId || s.id === where.id)
          .forEach((s) => Object.assign(s, data));
        return { count: 1 };
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const s = sessions.find((x) => x.id === where.id && !x.endedAt);
        if (!s) return null;
        const pass = passes.find((p) => p.id === s.passId);
        return { ...s, pass: { ...pass, event: { ...event } } };
      }),
    },
    eventTicket: { groupBy: jest.fn(async () => []) },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const counters = new Map<string, number>();
  const redis: any = {
    incr: jest.fn(
      async (k: string) => counters.set(k, (counters.get(k) ?? 0) + 1) && counters.get(k)!,
    ),
    expire: jest.fn(async () => undefined),
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    del: jest.fn(async () => undefined),
  };
  const audit: any = { log: jest.fn() };
  const svc = new EventCrewService(db, redis, audit);
  const pass = over.pass ? addPass(over.pass) : addPass();
  return { svc, db, passes, sessions, pass, addPass, redis, event };
}

describe('crew sign-in', () => {
  it('signs a phone in with the pass code, however it is typed', async () => {
    const w = world();
    const typed = formatCrewCode(crewCodeFor(w.pass.id)).toLowerCase();
    const out = await w.svc.login(typed, 'device-aaaa-1111', '1.2.3.4');
    expect(out.pass).toMatchObject({ label: 'Gate 1', level: 'SCAN' });
    expect(out.event).toMatchObject({ id: 'ev1', title: 'Open Mic Night' });
    expect(out.token).toMatch(/^C1\./);
    // That token now authenticates as this pass.
    const ctx = await w.svc.authenticate(out.token);
    expect(ctx).toMatchObject({
      passId: w.pass.id,
      eventId: 'ev1',
      level: 'SCAN',
      label: 'Gate 1',
    });
  });

  it('rejects unknown, malformed and revoked codes with the same answer', async () => {
    const w = world();
    const revoked = w.addPass({ revokedAt: new Date() });
    for (const code of ['ABCD-EFGH', 'nonsense', formatCrewCode(crewCodeFor(revoked.id))]) {
      await expect(w.svc.login(code, 'device-aaaa-1111', '1.2.3.4')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'CREW_CODE_INVALID' }),
      });
    }
  });

  it('slows down someone guessing codes', async () => {
    const w = world();
    for (let i = 0; i < 10; i++) {
      await w.svc.login('ABCD-EFGH', 'device-aaaa-1111', '9.9.9.9').catch(() => undefined);
    }
    await expect(w.svc.login('ABCD-EFGH', 'device-aaaa-1111', '9.9.9.9')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('refuses expired, not-yet-valid passes and cancelled events', async () => {
    const expired = world({ pass: { validUntil: new Date(Date.now() - 1000) } });
    await expect(
      expired.svc.login(crewCodeFor(expired.pass.id), 'device-aaaa-1111', '1.1.1.1'),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'CREW_EXPIRED' }) });

    const early = world({ pass: { validFrom: new Date(Date.now() + HOUR) } });
    await expect(
      early.svc.login(crewCodeFor(early.pass.id), 'device-aaaa-1111', '1.1.1.1'),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'CREW_NOT_YET' }) });

    const off = world({ event: { status: 'CANCELLED' } });
    await expect(
      off.svc.login(crewCodeFor(off.pass.id), 'device-aaaa-1111', '1.1.1.1'),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'EVENT_INACTIVE' }) });
  });

  it('limits a pass to its number of phones, but lets a phone come back', async () => {
    const w = world({ pass: { maxDevices: 2 } });
    const code = crewCodeFor(w.pass.id);
    await w.svc.login(code, 'phone-aaaa-0001', '1.1.1.1');
    await w.svc.login(code, 'phone-bbbb-0002', '1.1.1.1');
    await expect(w.svc.login(code, 'phone-cccc-0003', '1.1.1.1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CREW_DEVICE_LIMIT' }),
    });
    const again = await w.svc.login(code, 'phone-aaaa-0001', '1.1.1.1');
    expect(again.token).toMatch(/^C1\./);
    expect(w.sessions).toHaveLength(2);
  });

  it('stops working once the pass is revoked', async () => {
    const w = world();
    const out = await w.svc.login(crewCodeFor(w.pass.id), 'phone-aaaa-0001', '1.1.1.1');
    expect(await w.svc.authenticate(out.token)).not.toBeNull();
    await w.svc.revoke(host, 'ev1', w.pass.id);
    expect(await w.svc.authenticate(out.token)).toBeNull();
    expect(w.redis.del).toHaveBeenCalledWith(expect.stringMatching(/^crew:ctx:/));
  });

  it('rejects forged tokens', async () => {
    const w = world();
    expect(await w.svc.authenticate('C1.' + randomUUID() + '.' + 'A'.repeat(22))).toBeNull();
    expect(await w.svc.authenticate(undefined)).toBeNull();
  });
});

describe('creating passes', () => {
  it('creates numbered passes with codes the host can see again, storing only hashes', async () => {
    const w = world();
    w.passes.length = 0;
    const made = await w.svc.create(host, 'ev1', { count: 3, prefix: 'Gate' });
    expect(made.map((p) => p.label)).toEqual(['Gate 1', 'Gate 2', 'Gate 3']);
    for (const p of made) {
      expect(p.code).toBe(crewCodeFor(p.id));
      expect(p.codeDisplay).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
    for (const row of w.passes) {
      expect(JSON.stringify(row)).not.toContain(crewCodeFor(row.id));
    }
    // Default window: from check-in opening to check-in closing.
    expect(made[0].validFrom.getTime()).toBe(w.event.startDate.getTime() - 2 * HOUR);
    expect(made[0].validUntil.getTime()).toBe(w.event.endDate.getTime() + 2 * HOUR);
  });

  it('uses the labels it is given and the level and device limit asked for', async () => {
    const w = world();
    w.passes.length = 0;
    const made = await w.svc.create(host, 'ev1', {
      labels: ['Ravi (front)', 'Asha (desk)'],
      level: 'DESK',
      maxDevices: 1,
    });
    expect(made.map((p) => [p.label, p.level, p.maxDevices])).toEqual([
      ['Ravi (front)', 'DESK', 1],
      ['Asha (desk)', 'DESK', 1],
    ]);
  });

  it('stops at 100 passes per event', async () => {
    const w = world();
    w.passes.length = 0;
    for (let i = 0; i < 99; i++) w.addPass({ label: `P${i}` });
    await expect(w.svc.create(host, 'ev1', { count: 2 })).rejects.toThrow(/100 crew passes/);
    await expect(w.svc.create(host, 'ev1', { count: 1 })).resolves.toHaveLength(1);
  });

  it('refuses a pass that ends before it starts', async () => {
    const w = world();
    await expect(
      w.svc.create(host, 'ev1', {
        count: 1,
        validFrom: new Date(Date.now() + 2 * HOUR).toISOString(),
        validUntil: new Date(Date.now() + HOUR).toISOString(),
      }),
    ).rejects.toThrow(/start before it ends/);
  });
});
