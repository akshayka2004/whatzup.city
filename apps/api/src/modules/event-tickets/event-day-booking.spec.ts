import { randomUUID } from 'crypto';
import { bookingStateForDays, dayPricing, dayState, eventDays, istDay } from '@saas/types';
import { EventScanService } from './event-scan.service';
import { EventTicketsService } from './event-tickets.service';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Midnight India time (UTC+5:30) at the start of the given calendar day. */
const istMidnight = (day: string) => Date.parse(`${day}T00:00:00Z`) - 330 * 60_000;
const at = (day: string, hour: number, minute = 0) =>
  new Date(istMidnight(day) + hour * HOUR + minute * 60_000);

describe('splitting an event into days', () => {
  it('makes one day per calendar date in India, with the real start and end on the edges', () => {
    // Fri 10:30 to Sat 20:30 IST
    const days = eventDays(at('2026-11-06', 10, 30), at('2026-11-07', 20, 30));
    expect(days.map((d) => d.dayDate)).toEqual(['2026-11-06', '2026-11-07']);
    expect(days.map((d) => d.label)).toEqual(['Day 1 - Fri', 'Day 2 - Sat']);
    expect(+days[0].startsAt).toBe(+at('2026-11-06', 10, 30));
    expect(+days[1].endsAt).toBe(+at('2026-11-07', 20, 30));
    // The first day runs to the end of its date; the second starts at midnight.
    expect(istDay(days[0].endsAt)).toBe('2026-11-06');
    expect(+days[1].startsAt).toBe(istMidnight('2026-11-07'));
  });

  it('handles three days and a single-date event', () => {
    expect(eventDays(at('2026-11-06', 9), at('2026-11-08', 18))).toHaveLength(3);
    expect(eventDays(at('2026-11-06', 9), at('2026-11-06', 18))).toHaveLength(1);
    expect(eventDays(at('2026-11-06', 9), at('2026-11-06', 8))).toEqual([]);
  });
});

describe('what a day can show', () => {
  const event = {
    bookingMode: 'RSVP',
    bookingApproval: 'APPROVED',
    status: 'ACTIVE',
    startDate: at('2026-11-06', 10),
    endDate: at('2026-11-07', 20),
  };
  const day = (over: Record<string, any> = {}) => ({
    dayDate: '2026-11-07',
    label: 'Day 2',
    startsAt: at('2026-11-07', 10),
    endsAt: at('2026-11-07', 20),
    capacity: 2,
    seatsTaken: 0,
    isOpen: true,
    ...over,
  });
  const noon = at('2026-11-06', 12);

  it('is open, full, closed by the host, or over', () => {
    expect(dayState(event, day(), noon)).toBe('OPEN');
    expect(dayState(event, day({ seatsTaken: 2 }), noon)).toBe('FULL');
    expect(dayState(event, day({ isOpen: false }), noon)).toBe('CLOSED');
    expect(dayState(event, day(), at('2026-11-07', 21))).toBe('ENDED');
  });

  it('can have its own booking window', () => {
    const d = day({ rsvpOpensAt: at('2026-11-06', 18), rsvpClosesAt: at('2026-11-07', 9) });
    expect(dayState(event, d, noon)).toBe('NOT_OPEN');
    expect(dayState(event, d, at('2026-11-06', 19))).toBe('OPEN');
    expect(dayState(event, d, at('2026-11-07', 9, 30))).toBe('CLOSED');
  });

  it('sums up the event as open when any day is open', () => {
    const days = [day({ seatsTaken: 2 }), day({ dayDate: '2026-11-06' })];
    expect(bookingStateForDays(event, days, noon)).toBe('OPEN');
    expect(bookingStateForDays(event, [day({ seatsTaken: 2 })], noon)).toBe('FULL');
  });
});

describe('pricing days', () => {
  const days: any[] = [
    { id: 'd1', label: 'Day 1', dayDate: '2026-11-06', price: 100 },
    { id: 'd2', label: 'Day 2', dayDate: '2026-11-07', price: null },
  ];
  const event = { ticketType: 'PAID', ticketPrice: 150, allDaysPrice: 200 };

  it('uses a day price, or the event price when the day has none', () => {
    expect(dayPricing(event, [days[0]], days).perPerson).toBe(100);
    expect(dayPricing(event, [days[1]], days).perPerson).toBe(150);
  });

  it('uses the all-days price only when every day is chosen and it is cheaper', () => {
    const all = dayPricing(event, days, days);
    expect(all).toMatchObject({ perPerson: 200, bundle: true });
    expect(dayPricing({ ...event, allDaysPrice: 300 }, days, days)).toMatchObject({
      perPerson: 250,
      bundle: false,
    });
    expect(dayPricing(event, [days[0]], days).bundle).toBe(false);
  });

  it('is free on a free event', () => {
    expect(dayPricing({ ticketType: 'FREE', ticketPrice: null }, days, days).perPerson).toBe(100);
    expect(dayPricing({ ticketType: 'FREE' }, [{ ...days[1] }], days).perPerson).toBe(0);
  });
});

// ── booking, cancelling and waiting, against an in-memory copy of the tables ─────────────────────

function world(
  opts: {
    capacity?: number;
    paid?: boolean;
    allDaysPrice?: number | null;
    maxPerUser?: number;
  } = {},
) {
  const start = at(istDay(Date.now() + 5 * DAY), 10);
  const d1 = istDay(start);
  const d2 = istDay(+start + DAY);
  const event: any = {
    id: 'ev1',
    tenantId: 't1',
    title: 'Two day expo',
    status: 'ACTIVE',
    businessId: 'b1',
    bookingMode: 'RSVP',
    bookingApproval: 'APPROVED',
    capacity: null,
    seatsTaken: 0,
    rsvpOpensAt: null,
    rsvpClosesAt: null,
    startDate: start,
    endDate: at(d2, 20),
    maxPerUser: opts.maxPerUser ?? 3,
    cancelCutoffHours: 2,
    dayBooking: true,
    allDaysPrice: opts.allDaysPrice ?? null,
    ticketType: opts.paid ? 'PAID' : 'FREE',
    ticketPrice: opts.paid ? 100 : null,
    ticketTiers: null,
    payEnabled: !!opts.paid,
    payWindowHours: 24,
  };
  let days: any[] = [
    {
      id: 'day1',
      eventId: 'ev1',
      dayDate: d1,
      label: 'Day 1',
      startsAt: start,
      endsAt: at(d1, 20),
      capacity: opts.capacity ?? 2,
      seatsTaken: 0,
      checkedInCount: 0,
      price: null,
      isOpen: true,
      rsvpOpensAt: null,
      rsvpClosesAt: null,
      sortOrder: 0,
    },
    {
      id: 'day2',
      eventId: 'ev1',
      dayDate: d2,
      label: 'Day 2',
      startsAt: at(d2, 10),
      endsAt: at(d2, 20),
      capacity: opts.capacity ?? 2,
      seatsTaken: 0,
      checkedInCount: 0,
      price: null,
      isOpen: true,
      rsvpOpensAt: null,
      rsvpClosesAt: null,
      sortOrder: 1,
    },
  ];
  let tickets: any[] = [];
  let payments: any[] = [];
  const waitlist: any[] = [];
  const users: Record<string, any> = {
    u1: { id: 'u1', name: 'Asha', tenantId: 't1' },
    u2: { id: 'u2', name: 'Ravi', tenantId: 't1' },
    u3: { id: 'u3', name: 'Mina', tenantId: 't1' },
  };
  const matches = (t: any, where: any = {}) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && 'in' in v) return v.in.includes(t[k]);
      if (v && typeof v === 'object' && 'not' in v) return t[k] !== v.not && t[k] != null;
      return t[k] === v;
    });

  const tx: any = {
    $queryRaw: jest.fn(async () => []),
    $executeRaw: jest.fn(async (strings: TemplateStringsArray, ...vals: any[]) => {
      const sql = strings.join('?');
      if (sql.includes('event_days') && sql.includes('seats_taken + ')) {
        const [n, id] = vals as [number, string];
        const d = days.find((x) => x.id === id)!;
        if (d.capacity == null || d.seatsTaken + n <= d.capacity) {
          d.seatsTaken += n;
          return 1;
        }
        return 0;
      }
      if (sql.includes('event_days') && sql.includes('GREATEST')) {
        const [n, id] = vals as [number, string];
        const d = days.find((x) => x.id === id)!;
        d.seatsTaken = Math.max(0, d.seatsTaken - n);
        return 1;
      }
      return 1;
    }),
    event: { findFirst: jest.fn(async () => ({ ...event })) },
    eventDay: {
      findMany: jest.fn(async () => days.map((d) => ({ ...d }))),
      findUnique: jest.fn(async ({ where }: any) => {
        const d = days.find((x) => x.id === where.id);
        return d ? { ...d } : null;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const d = days.find((x) => x.id === where.id);
        return d ? { ...d } : null;
      }),
    },
    eventTicket: {
      findMany: jest.fn(async ({ where }: any) =>
        tickets.filter((t) => matches(t, where)).map((t) => ({ ...t })),
      ),
      count: jest.fn(async ({ where }: any) => tickets.filter((t) => matches(t, where)).length),
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
          if (matches(t, where)) {
            Object.assign(t, data);
            n++;
          }
        }
        return { count: n };
      }),
    },
    eventPayment: {
      create: jest.fn(async ({ data }: any) => {
        const p = { id: randomUUID(), status: 'PENDING', ...data };
        payments.push(p);
        return { ...p };
      }),
    },
    eventPaymentLog: { create: jest.fn(async () => ({})) },
    eventWaitlist: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          waitlist.find(
            (w) =>
              w.eventId === where.eventId &&
              w.userId === where.userId &&
              (w.dayId ?? null) === (where.dayId ?? null),
          ) ?? null,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        waitlist
          .filter(
            (w) =>
              w.eventId === where.eventId &&
              !w.promotedAt &&
              (where.dayId === undefined || w.dayId === where.dayId) &&
              (where.userId === undefined || w.userId === where.userId),
          )
          .sort((a, b) => +a.createdAt - +b.createdAt)
          .map((w) => ({
            ...w,
            user: users[w.userId],
            day: days.find((d) => d.id === w.dayId) ?? null,
          })),
      ),
      count: jest.fn(
        async ({ where }: any) =>
          waitlist.filter(
            (w) =>
              w.eventId === where.eventId &&
              !w.promotedAt &&
              (w.dayId ?? null) === (where.dayId ?? null) &&
              +w.createdAt < +where.createdAt.lt,
          ).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const w = {
          id: randomUUID(),
          createdAt: new Date(Date.now() + waitlist.length),
          promotedAt: null,
          ...data,
        };
        waitlist.push(w);
        return w;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        Object.assign(
          waitlist.find((w) => w.id === where.id),
          data,
        );
      }),
      delete: jest.fn(async ({ where }: any) => {
        waitlist.splice(
          waitlist.findIndex((w) => w.id === where.id),
          1,
        );
      }),
    },
  };

  const db: any = {
    ...tx,
    // A failed transaction puts everything back, like the real database does.
    $transaction: jest.fn(async (fn: any) => {
      const snap = structuredClone({ days, tickets, payments });
      try {
        return await fn(tx);
      } catch (err) {
        days = snap.days;
        tickets = snap.tickets;
        payments = snap.payments;
        throw err;
      }
    }),
    user: { findFirst: jest.fn(async ({ where }: any) => users[where.id] ?? null) },
    eventPayment: {
      ...tx.eventPayment,
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      count: jest.fn(async () => 0),
    },
    business: { findUnique: jest.fn(async () => ({ ownerId: 'host1' })) },
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
  return {
    svc,
    db,
    event,
    ids: { d1, d2 },
    days: () => days,
    tickets: () => tickets,
    payments: () => payments,
    waitlist,
  };
}

const both = ['day1', 'day2'];

describe('booking days', () => {
  it('gives one ticket per person per chosen day and counts the seats on each day', async () => {
    const w = world();
    const out = await w.svc.rsvp('u1', 'ev1', { dayIds: both, guests: ['Guest A'] });
    expect(out.tickets).toHaveLength(4);
    expect(w.days().map((d) => d.seatsTaken)).toEqual([2, 2]);
    expect(
      w
        .tickets()
        .map((t) => t.dayId)
        .sort(),
    ).toEqual(['day1', 'day1', 'day2', 'day2']);
    expect(w.tickets().every((t) => t.status === 'ISSUED')).toBe(true);
  });

  it('books a single day and lets the same person add another day later', async () => {
    const w = world();
    await w.svc.rsvp('u1', 'ev1', { dayIds: ['day1'] });
    expect(w.days().map((d) => d.seatsTaken)).toEqual([1, 0]);
    await w.svc.rsvp('u1', 'ev1', { dayIds: ['day2'] });
    expect(w.days().map((d) => d.seatsTaken)).toEqual([1, 1]);
    // The same day again, with nobody new, is refused.
    await expect(w.svc.rsvp('u1', 'ev1', { dayIds: ['day1'] })).rejects.toMatchObject({
      response: { code: 'ALREADY_REGISTERED' },
    });
  });

  it('keeps seats per day: a full day stops the booking and no seat is kept on the other day', async () => {
    const w = world({ capacity: 1 });
    await w.svc.rsvp('u1', 'ev1', { dayIds: ['day1'] });
    await expect(w.svc.rsvp('u2', 'ev1', { dayIds: both })).rejects.toMatchObject({
      response: { code: 'DAY_FULL', dayId: 'day1' },
    });
    expect(w.days().map((d) => d.seatsTaken)).toEqual([1, 0]);
    // The other day is still bookable.
    await expect(w.svc.rsvp('u2', 'ev1', { dayIds: ['day2'] })).resolves.toBeTruthy();
  });

  it('refuses an unknown day, an empty choice and a day the host closed', async () => {
    const w = world();
    await expect(w.svc.rsvp('u1', 'ev1', { dayIds: [] })).rejects.toThrow(/Choose the days/);
    await expect(w.svc.rsvp('u1', 'ev1', { dayIds: [randomUUID()] })).rejects.toThrow(
      /not part of this event/,
    );
    w.days()[0].isOpen = false;
    await expect(w.svc.rsvp('u1', 'ev1', { dayIds: ['day1'] })).rejects.toMatchObject({
      response: { code: 'RSVP_CLOSED' },
    });
  });

  it('applies the per-account limit to each day, not to the whole booking', async () => {
    const w = world({ maxPerUser: 2, capacity: 10 });
    await expect(
      w.svc.rsvp('u1', 'ev1', { dayIds: both, guests: ['A', 'B'] }),
    ).rejects.toMatchObject({ response: { code: 'SEAT_LIMIT' } });
    // Two people on each of two days is four tickets and is fine.
    const out = await w.svc.rsvp('u1', 'ev1', { dayIds: both, guests: ['A'] });
    expect(out.tickets).toHaveLength(4);
  });

  it('lets guests come on a different day from the registrant', async () => {
    const w = world();
    await w.svc.rsvp('u1', 'ev1', { dayIds: ['day1'] });
    const out = await w.svc.rsvp('u1', 'ev1', {
      dayIds: ['day2'],
      guests: ['Friend'],
      skipSelf: true,
    });
    expect(out.tickets).toHaveLength(1);
    expect(
      w
        .tickets()
        .filter((t) => t.dayId === 'day2')
        .map((t) => t.holderName),
    ).toEqual(['Friend']);
    // Guests only needs someone who has booked a day themselves.
    await expect(
      w.svc.rsvp('u2', 'ev1', { dayIds: ['day1'], guests: ['X'], skipSelf: true }),
    ).rejects.toThrow(/yourself first/);
  });

  it('returns the same tickets on a retry with the same key', async () => {
    const w = world();
    const first = await w.svc.rsvp('u1', 'ev1', { dayIds: both, idempotencyKey: 'abc' });
    const again = await w.svc.rsvp('u1', 'ev1', { dayIds: both, idempotencyKey: 'abc' });
    expect(again.already).toBe(true);
    expect(again.tickets).toHaveLength(first.tickets.length);
    expect(w.days().map((d) => d.seatsTaken)).toEqual([1, 1]);
  });
});

describe('paying for days', () => {
  it('adds up each day and holds the seats until payment', async () => {
    const w = world({ paid: true });
    w.days()[0].price = 100;
    w.days()[1].price = 40;
    const out = await w.svc.rsvp('u1', 'ev1', { dayIds: both, guests: ['G'] });
    expect(out.payment).toMatchObject({ amount: 280 });
    expect(w.tickets().every((t) => t.status === 'PENDING')).toBe(true);
    expect(w.payments()[0].dayBreakdown.bundle).toBe(false);
    expect(w.payments()[0].dayBreakdown.days.map((d: any) => d.price)).toEqual([100, 40]);
  });

  it('uses the all-days price when everyone comes every day', async () => {
    const w = world({ paid: true, allDaysPrice: 120 });
    w.days()[0].price = 100;
    w.days()[1].price = 100;
    const out = await w.svc.rsvp('u1', 'ev1', { dayIds: both });
    expect(out.payment).toMatchObject({ amount: 120 });
    expect(w.payments()[0].dayBreakdown.bundle).toBe(true);
    // One day alone is charged at the day price.
    const one = await w.svc.rsvp('u2', 'ev1', { dayIds: ['day1'] });
    expect(one.payment).toMatchObject({ amount: 100 });
  });

  it('skips payment when the chosen day is free', async () => {
    const w = world({ paid: true });
    w.days()[0].price = 0;
    const out = await w.svc.rsvp('u1', 'ev1', { dayIds: ['day1'] });
    expect(out.payment).toBeNull();
    expect(w.tickets()[0].status).toBe('ISSUED');
  });

  it('gives the day seats back when a held payment is cancelled', async () => {
    const w = world({ paid: true });
    const out = await w.svc.rsvp('u1', 'ev1', { dayIds: both });
    expect(w.days().map((d) => d.seatsTaken)).toEqual([1, 1]);
    // The payments service cancels the held tickets, then asks for the day seats back.
    await w.db.$transaction(async (tx: any) => {
      await tx.eventTicket.updateMany({
        where: { paymentId: out.payment!.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      await w.svc.releaseDaysForPayment(tx, out.payment!.id);
    });
    expect(w.days().map((d) => d.seatsTaken)).toEqual([0, 0]);
  });
});

describe('cancelling and waiting for a day', () => {
  it('cancels one day and frees only that day', async () => {
    const w = world();
    const out = await w.svc.rsvp('u1', 'ev1', { dayIds: both });
    const day2Ticket = out.tickets.find(
      (t: any) => w.tickets().find((x) => x.id === t.id)?.dayId === 'day2',
    )!;
    const res = await w.svc.cancel('u1', 'ev1', [day2Ticket.id]);
    expect(res.cancelled).toBe(1);
    expect(w.days().map((d) => d.seatsTaken)).toEqual([1, 0]);
  });

  it('will not cancel a day that is about to start', async () => {
    const w = world();
    await w.svc.rsvp('u1', 'ev1', { dayIds: ['day1'] });
    w.days()[0].startsAt = new Date(Date.now() + HOUR);
    await expect(w.svc.cancel('u1', 'ev1')).rejects.toMatchObject({
      response: { code: 'CANCEL_TOO_LATE' },
    });
  });

  it('waits for one full day and is placed on that day when a seat frees', async () => {
    const w = world({ capacity: 1 });
    await w.svc.rsvp('u1', 'ev1', { dayIds: both });
    // Day 1 is full for u2, who waits for it.
    await expect(w.svc.joinWaitlist('u2', 'ev1', 1, undefined)).rejects.toThrow(/Choose the day/);
    await w.svc.joinWaitlist('u2', 'ev1', 1, undefined, 'day1');
    // Not needed on a day with room.
    w.days()[1].capacity = 5;
    await expect(w.svc.joinWaitlist('u3', 'ev1', 1, undefined, 'day2')).rejects.toMatchObject({
      response: { code: 'WAITLIST_NOT_NEEDED' },
    });

    const ticket = w.tickets().find((t) => t.dayId === 'day1')!;
    await w.svc.cancel('u1', 'ev1', [ticket.id]);
    const placed = w.tickets().filter((t) => t.userId === 'u2' && t.status === 'ISSUED');
    expect(placed.map((t) => t.dayId)).toEqual(['day1']);
    expect(w.days()[0].seatsTaken).toBe(1);
    expect(w.waitlist[0].promotedAt).toBeInstanceOf(Date);
  });
});

describe('the gate on a day-booked event', () => {
  function gate(dayOffsetDays: number) {
    const todayStr = istDay(Date.now());
    const ticketDay = istDay(Date.now() + dayOffsetDays * DAY);
    const day = {
      id: 'day1',
      label: 'Day 1 - Fri',
      dayDate: ticketDay,
      startsAt: at(ticketDay, 10),
      endsAt: at(ticketDay, 20),
    };
    const scans: any[] = [];
    const db: any = {
      event: {
        findFirst: jest.fn(async () => ({
          id: 'ev1',
          title: 'Expo',
          status: 'ACTIVE',
          startDate: at(todayStr, 0),
          endDate: at(todayStr, 23),
          checkInOpensAt: null,
          checkInClosesAt: null,
          venueCapacity: null,
          dayBooking: true,
        })),
      },
      eventTicket: {
        findFirst: jest.fn(async () => ({ day })),
        findUnique: jest.fn(async () => ({
          id: 't1',
          eventId: 'ev1',
          status: 'ISSUED',
          holderName: 'Asha',
          code: 'AAAAAA',
          isGuest: false,
          user: { name: 'Asha' },
        })),
      },
      eventScan: {
        create: jest.fn(async ({ data }: any) => {
          scans.push(data);
          return data;
        }),
      },
      $transaction: jest.fn(async (fn: any) =>
        fn({
          $queryRaw: jest.fn(async () => [
            {
              id: 't1',
              holder_name: 'Asha',
              code: 'AAAAAA',
              is_guest: false,
              checked_in_at: new Date(),
              user_id: 'u1',
              day_id: 'day1',
            },
          ]),
          $executeRaw: jest.fn(async () => 1),
          eventScan: { create: jest.fn(async () => ({})) },
        }),
      ),
    };
    const redis: any = { get: jest.fn(async () => null), set: jest.fn(), del: jest.fn() };
    const ctx: any = {
      passId: 'p1',
      tenantId: 't1',
      eventId: 'ev1',
      label: 'Gate 1',
      level: 'SCAN',
    };
    return { svc: new EventScanService(db, redis), ctx, scans, db };
  }

  it('turns away a ticket for another day, and says which day it is for', async () => {
    const { svc, ctx, scans } = gate(-1);
    const out = await svc.manual({ ...ctx, level: 'DESK' }, 't1');
    expect(out.result).toBe('WRONG_DAY');
    expect(out.message).toMatch(/Day 1 - Fri/);
    expect(scans.map((s) => s.result)).toEqual(['WRONG_DAY']);
  });

  it('admits a ticket on its own day', async () => {
    const { svc, ctx } = gate(0);
    const out = await svc.manual({ ...ctx, level: 'DESK' }, 't1');
    expect(out.result).toBe('VALID');
  });
});
