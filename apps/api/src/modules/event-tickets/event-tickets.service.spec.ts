import { randomUUID } from 'crypto';
import { BOOKING_LIMITS, bookingState, cancelDeadline, checkInWindow } from '@saas/types';
import { EventTicketsService } from './event-tickets.service';

const HOUR = 3_600_000;

/** In-memory stand-in for the tables the RSVP code touches, including the seat counter. */
function world(over: Record<string, any> = {}) {
  const event: any = {
    id: 'ev1',
    tenantId: 't1',
    title: 'Open Mic Night',
    status: 'ACTIVE',
    businessId: 'b1',
    bookingMode: 'RSVP',
    bookingApproval: 'APPROVED',
    capacity: 2,
    seatsTaken: 0,
    rsvpOpensAt: null,
    rsvpClosesAt: null,
    startDate: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 27 * HOUR),
    maxPerUser: 3,
    cancelCutoffHours: 2,
    ...over,
  };
  const tickets: any[] = [];
  const waitlist: any[] = [];
  const users: Record<string, any> = {
    u1: { id: 'u1', name: 'Asha', tenantId: 't1' },
    u2: { id: 'u2', name: 'Ravi', tenantId: 't1' },
    u3: { id: 'u3', name: 'Mina', tenantId: 't1' },
  };

  const activeOf = (userId: string) =>
    tickets.filter((t) => t.userId === userId && ['ISSUED', 'CHECKED_IN'].includes(t.status));

  const tx: any = {
    $queryRaw: jest.fn(async () => []),
    // The two seat statements: reserve (only if it fits) and release.
    $executeRaw: jest.fn(async (strings: TemplateStringsArray, ...vals: any[]) => {
      const sql = strings.join('?');
      if (sql.includes('seats_taken + ')) {
        const n = vals[0] as number;
        if (event.capacity == null || event.seatsTaken + n <= event.capacity) {
          event.seatsTaken += n;
          return 1;
        }
        return 0;
      }
      if (sql.includes('GREATEST')) {
        event.seatsTaken = Math.max(0, event.seatsTaken - (vals[0] as number));
        return 1;
      }
      return 1;
    }),
    event: { findFirst: jest.fn(async () => ({ ...event })) },
    eventTicket: {
      findMany: jest.fn(async ({ where }: any) => {
        let rows = tickets.filter((t) => t.userId === where.userId && t.eventId === where.eventId);
        if (where.status?.in) rows = rows.filter((t) => where.status.in.includes(t.status));
        else if (typeof where.status === 'string')
          rows = rows.filter((t) => t.status === where.status);
        if (where.id?.in) rows = rows.filter((t) => where.id.in.includes(t.id));
        return rows.map((t) => ({ ...t }));
      }),
      create: jest.fn(async ({ data }: any) => {
        const t = {
          id: randomUUID(),
          status: 'ISSUED',
          issuedAt: new Date(),
          checkedInAt: null,
          ...data,
        };
        tickets.push(t);
        return { ...t };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let n = 0;
        for (const t of tickets) {
          if (where.id.in.includes(t.id) && t.status === where.status) {
            Object.assign(t, data);
            n++;
          }
        }
        return { count: n };
      }),
    },
    eventWaitlist: {
      update: jest.fn(async ({ where, data }: any) => {
        Object.assign(
          waitlist.find((w) => w.id === where.id),
          data,
        );
      }),
    },
  };

  const db: any = {
    ...tx,
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    user: { findFirst: jest.fn(async ({ where }: any) => users[where.id] ?? null) },
    eventPayment: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => []),
    },
    eventWaitlist: {
      ...tx.eventWaitlist,
      findMany: jest.fn(async ({ where }: any) =>
        waitlist
          .filter((w) => w.eventId === where.eventId && !w.promotedAt)
          .sort((x, y) => +x.createdAt - +y.createdAt)
          .map((w) => ({ ...w, user: users[w.userId] })),
      ),
      findFirst: jest.fn(
        async ({ where }: any) =>
          waitlist.find(
            (w) => w.eventId === where.eventId && w.userId === where.userId && !w.promotedAt,
          ) ?? null,
      ),
      count: jest.fn(
        async ({ where }: any) =>
          waitlist.filter(
            (w) =>
              w.eventId === where.eventId && !w.promotedAt && +w.createdAt < +where.createdAt.lt,
          ).length,
      ),
      delete: jest.fn(async ({ where }: any) => {
        waitlist.splice(
          waitlist.findIndex((w) => w.id === where.id),
          1,
        );
      }),
      upsert: jest.fn(async ({ create }: any) => {
        const w = { id: randomUUID(), createdAt: new Date(), promotedAt: null, ...create };
        waitlist.push(w);
        return w;
      }),
    },
    eventTicket: {
      ...tx.eventTicket,
      count: jest.fn(async ({ where }: any) => activeOf(where.userId).length),
    },
  };
  const counters = new Map<string, number>();
  const redis: any = {
    incr: jest.fn(async (k: string) => {
      counters.set(k, (counters.get(k) ?? 0) + 1);
      return counters.get(k)!;
    }),
    expire: jest.fn(async () => undefined),
    del: jest.fn(async () => undefined),
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
  };
  const notifications: any = { send: jest.fn(async () => ({})) };
  const audit: any = { log: jest.fn() };
  const svc = new EventTicketsService(db, redis, notifications, audit);
  return { svc, event, tickets, waitlist, notifications, redis, db };
}

const flush = () => new Promise((r) => setImmediate(r));

describe('RSVP', () => {
  it('issues a ticket in the account name and takes one seat', async () => {
    const w = world();
    const out = await w.svc.rsvp('u1', 'ev1', {});
    expect(out.tickets).toHaveLength(1);
    expect(out.tickets[0]).toMatchObject({ holderName: 'Asha', isGuest: false, status: 'ISSUED' });
    expect(out.tickets[0].code).toMatch(/^[A-Z2-9]{6}$/);
    expect(w.event.seatsTaken).toBe(1);
    await flush();
    expect(w.notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', type: 'EVENT_TICKET' }),
    );
  });

  it('gives each guest their own ticket and counts every seat', async () => {
    const w = world({ capacity: 5 });
    const out = await w.svc.rsvp('u1', 'ev1', { guests: ['  Priya  ', 'Kiran'] });
    expect(out.tickets.map((t) => [t.holderName, t.isGuest])).toEqual([
      ['Asha', false],
      ['Priya', true],
      ['Kiran', true],
    ]);
    expect(w.event.seatsTaken).toBe(3);
  });

  it('never goes past capacity: the last seat goes to one person only', async () => {
    const w = world({ capacity: 1 });
    await w.svc.rsvp('u1', 'ev1', {});
    await expect(w.svc.rsvp('u2', 'ev1', {})).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVENT_FULL' }),
    });
    expect(w.event.seatsTaken).toBe(1);
    expect(w.tickets).toHaveLength(1);
  });

  it('refuses a booking with guests that does not fit and takes no seat', async () => {
    const w = world({ capacity: 2 });
    await expect(w.svc.rsvp('u1', 'ev1', { guests: ['A', 'B'] })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVENT_FULL' }),
    });
    expect(w.event.seatsTaken).toBe(0);
  });

  it('answers a retry with the same key by returning the same tickets', async () => {
    const w = world({ capacity: 5 });
    const a = await w.svc.rsvp('u1', 'ev1', { idempotencyKey: 'k1' });
    const b = await w.svc.rsvp('u1', 'ev1', { idempotencyKey: 'k1' });
    expect(b.already).toBe(true);
    expect(b.tickets.map((t) => t.id)).toEqual(a.tickets.map((t) => t.id));
    expect(w.event.seatsTaken).toBe(1);
  });

  it('stops a second plain RSVP by the same account', async () => {
    const w = world({ capacity: 5 });
    await w.svc.rsvp('u1', 'ev1', {});
    await expect(w.svc.rsvp('u1', 'ev1', {})).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ALREADY_REGISTERED' }),
    });
    expect(w.event.seatsTaken).toBe(1);
  });

  it('enforces seats per account across several requests', async () => {
    const w = world({ capacity: 10, maxPerUser: 2 });
    await w.svc.rsvp('u1', 'ev1', { guests: ['G1'] });
    await expect(w.svc.rsvp('u1', 'ev1', { guests: ['G2'] })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SEAT_LIMIT' }),
    });
    expect(w.event.seatsTaken).toBe(2);
  });

  it('adds guests later without a second ticket for the account holder', async () => {
    const w = world({ capacity: 10, maxPerUser: 3 });
    await w.svc.rsvp('u1', 'ev1', {});
    const out = await w.svc.rsvp('u1', 'ev1', { guests: ['G1'] });
    expect(out.tickets.map((t) => t.holderName)).toEqual(['G1']);
    expect(w.event.seatsTaken).toBe(2);
  });

  it.each([
    ['PENDING', { bookingApproval: 'PENDING' }, 'RSVP_PENDING_APPROVAL'],
    ['not open yet', { rsvpOpensAt: new Date(Date.now() + HOUR) }, 'RSVP_NOT_OPEN'],
    ['closed', { rsvpClosesAt: new Date(Date.now() - HOUR) }, 'RSVP_CLOSED'],
    ['cancelled', { status: 'CANCELLED' }, 'RSVP_CANCELLED'],
    [
      'ended',
      { endDate: new Date(Date.now() - HOUR), startDate: new Date(Date.now() - 3 * HOUR) },
      'RSVP_ENDED',
    ],
    ['listing only', { bookingMode: 'NONE' }, 'RSVP_NONE'],
  ])('refuses when the event is %s', async (_name, over, code) => {
    const w = world(over);
    await expect(w.svc.rsvp('u1', 'ev1', {})).rejects.toMatchObject({
      response: expect.objectContaining({ code }),
    });
    expect(w.tickets).toHaveLength(0);
    expect(w.event.seatsTaken).toBe(0);
  });

  it('limits how fast one account can try', async () => {
    const w = world({ capacity: 100 });
    for (let i = 0; i < 15; i++) await w.svc.rsvp('u1', 'ev1', {}).catch(() => undefined);
    await expect(w.svc.rsvp('u1', 'ev1', {})).rejects.toMatchObject({ status: 429 });
  });

  it('keeps going when the notification fails', async () => {
    const w = world();
    w.notifications.send.mockRejectedValueOnce(new Error('queue down'));
    await expect(w.svc.rsvp('u1', 'ev1', {})).resolves.toBeDefined();
  });
});

describe('cancelling and the waitlist', () => {
  it('frees the seat and gives it to the first person waiting', async () => {
    const w = world({ capacity: 1 });
    await w.svc.rsvp('u1', 'ev1', {});
    await w.svc.joinWaitlist('u2', 'ev1');
    expect(w.waitlist).toHaveLength(1);

    const out = await w.svc.cancel('u1', 'ev1');
    expect(out.cancelled).toBe(1);
    expect(w.tickets.find((t) => t.userId === 'u1')!.status).toBe('CANCELLED');
    // Seat went straight to the waiting person.
    const u2 = w.tickets.find((t) => t.userId === 'u2');
    expect(u2).toMatchObject({ status: 'ISSUED', source: 'waitlist', holderName: 'Ravi' });
    expect(w.event.seatsTaken).toBe(1);
    expect(w.waitlist[0].promotedAt).toBeInstanceOf(Date);
  });

  it('promotes in the order people joined', async () => {
    const w = world({ capacity: 1 });
    await w.svc.rsvp('u1', 'ev1', {});
    await w.svc.joinWaitlist('u2', 'ev1');
    await w.svc.joinWaitlist('u3', 'ev1');
    w.waitlist[0].createdAt = new Date(Date.now() - 2000);
    w.waitlist[1].createdAt = new Date(Date.now() - 1000);
    await w.svc.cancel('u1', 'ev1');
    expect(w.tickets.some((t) => t.userId === 'u2' && t.status === 'ISSUED')).toBe(true);
    expect(w.tickets.some((t) => t.userId === 'u3')).toBe(false);
  });

  it('refuses to cancel after the cut-off', async () => {
    const w = world({
      capacity: 5,
      startDate: new Date(Date.now() + HOUR),
      endDate: new Date(Date.now() + 3 * HOUR),
      cancelCutoffHours: 2,
    });
    await w.svc.rsvp('u1', 'ev1', {});
    await expect(w.svc.cancel('u1', 'ev1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CANCEL_TOO_LATE' }),
    });
    expect(w.event.seatsTaken).toBe(1);
  });

  it('cannot cancel a ticket that was already used', async () => {
    const w = world({ capacity: 5 });
    await w.svc.rsvp('u1', 'ev1', {});
    w.tickets[0].status = 'CHECKED_IN';
    await expect(w.svc.cancel('u1', 'ev1')).rejects.toThrow('nothing to cancel');
    expect(w.event.seatsTaken).toBe(1);
  });

  it('cancels one guest and keeps the rest', async () => {
    const w = world({ capacity: 5 });
    await w.svc.rsvp('u1', 'ev1', { guests: ['G1'] });
    const guest = w.tickets.find((t) => t.isGuest)!;
    await w.svc.cancel('u1', 'ev1', [guest.id]);
    expect(w.event.seatsTaken).toBe(1);
    expect(w.tickets.find((t) => !t.isGuest)!.status).toBe('ISSUED');
  });

  it('only opens the waitlist when the event is actually full', async () => {
    const w = world({ capacity: 5 });
    await expect(w.svc.joinWaitlist('u2', 'ev1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'WAITLIST_NOT_NEEDED' }),
    });
  });
});

describe('shared booking rules', () => {
  const base = {
    bookingMode: 'RSVP',
    bookingApproval: 'APPROVED',
    status: 'ACTIVE',
    capacity: 10,
    seatsTaken: 0,
    startDate: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 27 * HOUR),
  };

  it('reports each state', () => {
    expect(bookingState(base)).toBe('OPEN');
    expect(bookingState({ ...base, seatsTaken: 10 })).toBe('FULL');
    expect(bookingState({ ...base, bookingMode: 'NONE' })).toBe('NONE');
    expect(bookingState({ ...base, bookingApproval: 'PENDING' })).toBe('PENDING_APPROVAL');
    expect(bookingState({ ...base, rsvpOpensAt: new Date(Date.now() + HOUR) })).toBe('NOT_OPEN');
  });

  it('closes at the start of the event when the host sets no closing time', () => {
    expect(bookingState(base, base.startDate.getTime() + 1)).toBe('CLOSED');
  });

  it('has a sensible check-in window and cancel deadline by default', () => {
    const win = checkInWindow(base);
    expect(win.opens).toBe(
      base.startDate.getTime() - BOOKING_LIMITS.checkInOpensHoursBefore * HOUR,
    );
    expect(win.closes).toBe(base.endDate.getTime() + BOOKING_LIMITS.checkInClosesHoursAfter * HOUR);
    expect(cancelDeadline({ startDate: base.startDate, cancelCutoffHours: 4 })).toBe(
      base.startDate.getTime() - 4 * HOUR,
    );
  });
});
