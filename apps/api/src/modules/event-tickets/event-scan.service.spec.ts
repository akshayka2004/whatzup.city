import { randomUUID } from 'crypto';
import { ticketQr } from '../../common/utils/ticket-signing';
import { CrewContext } from './event-crew.service';
import { EventScanService } from './event-scan.service';

const HOUR = 3_600_000;

function world(over: { event?: Record<string, any>; level?: 'SCAN' | 'DESK' } = {}) {
  const event: any = {
    id: 'ev1',
    title: 'Open Mic Night',
    status: 'ACTIVE',
    // Doors open: starts in 30 minutes, so check-in (2 hours before) is open.
    startDate: new Date(Date.now() + 0.5 * HOUR),
    endDate: new Date(Date.now() + 3 * HOUR),
    checkInOpensAt: null,
    checkInClosesAt: null,
    venueCapacity: null,
    checkedInCount: 0,
    ...over.event,
  };
  const tickets = new Map<string, any>();
  const scans: any[] = [];
  const passes: Record<string, any> = { p1: { label: 'Gate 1' }, p2: { label: 'Gate 2' } };

  const add = (o: Partial<any> = {}) => {
    const t = {
      id: randomUUID(),
      eventId: 'ev1',
      userId: 'u1',
      holderName: 'Asha',
      code: 'K7M3Q9',
      isGuest: false,
      status: 'ISSUED',
      checkedInAt: null,
      checkedInPassId: null,
      user: { name: 'Asha' },
      ...o,
    };
    tickets.set(t.id, t);
    return t;
  };

  let undoWindowOpen = true;
  const tx: any = {
    $queryRaw: jest.fn(async (strings: TemplateStringsArray, ...vals: any[]) => {
      const sql = strings.join('?');
      if (sql.includes("SET status = 'CHECKED_IN'")) {
        const [passId, ticketId, eventId] = vals;
        const t = tickets.get(ticketId);
        if (!t || t.eventId !== eventId || t.status !== 'ISSUED') return [];
        Object.assign(t, {
          status: 'CHECKED_IN',
          checkedInAt: new Date(),
          checkedInPassId: passId,
        });
        return [
          {
            id: t.id,
            holder_name: t.holderName,
            code: t.code,
            is_guest: t.isGuest,
            checked_in_at: t.checkedInAt,
            user_id: t.userId,
          },
        ];
      }
      if (sql.includes("SET status = 'ISSUED'")) {
        const [ticketId, , passId] = vals;
        const t = tickets.get(ticketId);
        if (!undoWindowOpen || !t || t.status !== 'CHECKED_IN' || t.checkedInPassId !== passId)
          return [];
        Object.assign(t, { status: 'ISSUED', checkedInAt: null, checkedInPassId: null });
        return [{ id: t.id }];
      }
      return [];
    }),
    $executeRaw: jest.fn(async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('checked_in_count + 1')) event.checkedInCount += 1;
      if (sql.includes('GREATEST(checked_in_count'))
        event.checkedInCount = Math.max(0, event.checkedInCount - 1);
      return 1;
    }),
    eventScan: {
      create: jest.fn(async ({ data }: any) => {
        scans.push(data);
        return data;
      }),
    },
  };
  const db: any = {
    ...tx,
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    event: { findFirst: jest.fn(async () => ({ ...event })) },
    eventTicket: {
      findUnique: jest.fn(async ({ where }: any) => tickets.get(where.id) ?? null),
      findFirst: jest.fn(
        async ({ where }: any) =>
          [...tickets.values()].find((t) => t.eventId === where.eventId && t.code === where.code) ??
          null,
      ),
      findMany: jest.fn(async () => [...tickets.values()].filter((t) => t.status !== 'CANCELLED')),
      count: jest.fn(
        async ({ where }: any) =>
          [...tickets.values()].filter((t) =>
            where.status?.in ? where.status.in.includes(t.status) : t.status === where.status,
          ).length,
      ),
    },
    eventCrewPass: { findUnique: jest.fn(async ({ where }: any) => passes[where.id] ?? null) },
    eventScan: { ...tx.eventScan, groupBy: jest.fn() },
  };
  const redis: any = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    del: jest.fn(async () => undefined),
  };
  const ctx: CrewContext = {
    sessionId: 's1',
    passId: 'p1',
    eventId: 'ev1',
    tenantId: 't1',
    level: over.level ?? 'SCAN',
    label: 'Gate 1',
    validUntil: Date.now() + 5 * HOUR,
  };
  const svc = new EventScanService(db, redis);
  return {
    svc,
    ctx,
    event,
    add,
    tickets,
    scans,
    other: { ...ctx, passId: 'p2', label: 'Gate 2' } as CrewContext,
    closeUndoWindow: () => (undoWindowOpen = false),
  };
}

describe('scanning a ticket', () => {
  it('admits a genuine ticket once and records the arrival', async () => {
    const w = world();
    const t = w.add();
    const out = await w.svc.scanQr(w.ctx, ticketQr(t.id));
    expect(out.result).toBe('VALID');
    expect(out.ticket).toMatchObject({ holderName: 'Asha', code: 'K7M3Q9' });
    expect(out.ticket?.checkedInAt).toBeInstanceOf(Date);
    expect(w.tickets.get(t.id)).toMatchObject({ status: 'CHECKED_IN', checkedInPassId: 'p1' });
    expect(w.event.checkedInCount).toBe(1);
    expect(w.scans).toEqual([
      expect.objectContaining({ result: 'VALID', passId: 'p1', ticketId: t.id }),
    ]);
  });

  it('turns the second scan away and says when and where the first one was', async () => {
    const w = world();
    const t = w.add();
    await w.svc.scanQr(w.ctx, ticketQr(t.id));
    const again = await w.svc.scanQr(w.other, ticketQr(t.id));
    expect(again.result).toBe('DUPLICATE');
    expect(again.ticket?.checkedInBy).toBe('Gate 1');
    expect(again.ticket?.checkedInAt).toBeInstanceOf(Date);
    expect(w.event.checkedInCount).toBe(1);
    expect(w.scans.map((s) => s.result)).toEqual(['VALID', 'DUPLICATE']);
  });

  it('two gates scanning at once admit the person only once', async () => {
    const w = world();
    const t = w.add();
    const [a, b] = await Promise.all([
      w.svc.scanQr(w.ctx, ticketQr(t.id)),
      w.svc.scanQr(w.other, ticketQr(t.id)),
    ]);
    expect([a.result, b.result].sort()).toEqual(['DUPLICATE', 'VALID']);
    expect(w.event.checkedInCount).toBe(1);
  });

  it('rejects forged and unrelated QR codes without touching tickets', async () => {
    const w = world();
    const t = w.add();
    for (const junk of [
      'hello',
      'https://platform.whtzup.city/b/K7M3Q9',
      `T1.${t.id}.${'A'.repeat(22)}`,
    ]) {
      const out = await w.svc.scanQr(w.ctx, junk);
      expect(out.result).toBe('INVALID');
    }
    expect(w.tickets.get(t.id)!.status).toBe('ISSUED');
    expect(w.event.checkedInCount).toBe(0);
  });

  it('tells crew when the ticket is for another event or was cancelled', async () => {
    const w = world();
    const other = w.add({ eventId: 'ev2' });
    expect((await w.svc.scanQr(w.ctx, ticketQr(other.id))).result).toBe('WRONG_EVENT');
    const gone = w.add({ status: 'CANCELLED', code: 'AAAAAA' });
    expect((await w.svc.scanQr(w.ctx, ticketQr(gone.id))).result).toBe('CANCELLED');
    expect((await w.svc.scanQr(w.ctx, ticketQr(randomUUID()))).result).toBe('INVALID');
    expect(w.event.checkedInCount).toBe(0);
  });

  it('refuses outside the check-in window and when the event is cancelled', async () => {
    const early = world({
      event: {
        startDate: new Date(Date.now() + 10 * HOUR),
        endDate: new Date(Date.now() + 12 * HOUR),
      },
    });
    const t1 = early.add();
    expect((await early.svc.scanQr(early.ctx, ticketQr(t1.id))).result).toBe('OUTSIDE_WINDOW');

    const late = world({
      event: {
        startDate: new Date(Date.now() - 10 * HOUR),
        endDate: new Date(Date.now() - 6 * HOUR),
      },
    });
    const t2 = late.add();
    expect((await late.svc.scanQr(late.ctx, ticketQr(t2.id))).result).toBe('OUTSIDE_WINDOW');

    const off = world({ event: { status: 'CANCELLED' } });
    const t3 = off.add();
    expect((await off.svc.scanQr(off.ctx, ticketQr(t3.id))).result).toBe('CANCELLED');
    expect(t1.status === 'ISSUED' && t2.status === 'ISSUED' && t3.status === 'ISSUED').toBe(true);
  });

  it('accepts the short code under the QR', async () => {
    const w = world();
    w.add({ code: 'K7M3Q9' });
    expect((await w.svc.byCode(w.ctx, ' k7m3q9 ')).result).toBe('VALID');
    expect((await w.svc.byCode(w.ctx, 'ZZZZZZ')).result).toBe('INVALID');
  });
});

describe('desk features and undo', () => {
  it('lets only desk passes search and check in by hand', async () => {
    const scan = world({ level: 'SCAN' });
    const t = scan.add();
    await expect(scan.svc.search(scan.ctx, 'asha')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CREW_DESK_ONLY' }),
    });
    await expect(scan.svc.manual(scan.ctx, t.id)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CREW_DESK_ONLY' }),
    });

    const desk = world({ level: 'DESK' });
    const d = desk.add();
    const out = await desk.svc.manual(desk.ctx, d.id);
    expect(out).toMatchObject({ result: 'VALID', manual: true });
    expect(desk.scans[0].result).toBe('MANUAL');
  });

  it('undoes a check-in made by the same pass in time, and no one else', async () => {
    const w = world();
    const t = w.add();
    await w.svc.scanQr(w.ctx, ticketQr(t.id));
    expect((await w.svc.undo(w.other, t.id)).undone).toBe(false);
    expect(w.tickets.get(t.id)!.status).toBe('CHECKED_IN');
    expect((await w.svc.undo(w.ctx, t.id)).undone).toBe(true);
    expect(w.tickets.get(t.id)!.status).toBe('ISSUED');
    expect(w.event.checkedInCount).toBe(0);
    // The person can now be scanned in again.
    expect((await w.svc.scanQr(w.ctx, ticketQr(t.id))).result).toBe('VALID');
  });

  it('will not undo once the minute is up', async () => {
    const w = world();
    const t = w.add();
    await w.svc.scanQr(w.ctx, ticketQr(t.id));
    w.closeUndoWindow();
    const out = await w.svc.undo(w.ctx, t.id);
    expect(out.undone).toBe(false);
    expect(out.message).toMatch(/60 seconds/);
  });
});
