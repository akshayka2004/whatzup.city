import { randomUUID } from 'crypto';
import { EventDaysService } from './event-days.service';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const istMidnight = (day: string) => Date.parse(`${day}T00:00:00Z`) - 330 * 60_000;
const istDate = (ms: number) => new Date(ms + 330 * 60_000).toISOString().slice(0, 10);
const at = (day: string, hour: number) => new Date(istMidnight(day) + hour * HOUR);

const admin: any = { id: 'adm1', role: 'SUPER_ADMIN' };

function world(over: Record<string, any> = {}) {
  const d1 = istDate(Date.now() + 5 * DAY);
  const d2 = istDate(Date.now() + 6 * DAY);
  const d3 = istDate(Date.now() + 7 * DAY);
  const event: any = {
    id: 'ev1',
    tenantId: 't1',
    title: 'Expo',
    status: 'ACTIVE',
    businessId: null,
    bookingMode: 'RSVP',
    bookingApproval: 'APPROVED',
    capacity: 50,
    seatsTaken: 0,
    startDate: at(d1, 10),
    endDate: at(d2, 20),
    ticketType: 'FREE',
    ticketPrice: null,
    ticketTiers: null,
    dayBooking: false,
    allDaysPrice: null,
    ...over,
  };
  let days: any[] = [];
  let tickets: any[] = [];
  let waitlist: any[] = [];

  const db: any = {
    event: {
      findFirst: jest.fn(async () => ({ ...event })),
      update: jest.fn(async ({ data }: any) => Object.assign(event, data)),
    },
    eventDay: {
      findMany: jest.fn(async () =>
        days.map((d) => ({ ...d })).sort((a, b) => a.sortOrder - b.sortOrder),
      ),
      create: jest.fn(async ({ data }: any) => {
        const d = { id: randomUUID(), seatsTaken: 0, checkedInCount: 0, isOpen: true, ...data };
        days.push(d);
        return { ...d };
      }),
      update: jest.fn(async ({ where, data }: any) =>
        Object.assign(
          days.find((d) => d.id === where.id),
          data,
        ),
      ),
      delete: jest.fn(async ({ where }: any) => {
        days = days.filter((d) => d.id !== where.id);
      }),
      deleteMany: jest.fn(async () => {
        days = [];
      }),
    },
    eventTicket: {
      count: jest.fn(
        async ({ where }: any) =>
          tickets.filter(
            (t) =>
              (!where.dayId ||
                (where.dayId.not === null ? t.dayId != null : t.dayId === where.dayId)) &&
              (!where.status?.in || where.status.in.includes(t.status)),
          ).length,
      ),
      groupBy: jest.fn(async () => []),
    },
    eventWaitlist: {
      count: jest.fn(async () => waitlist.length),
      groupBy: jest.fn(async () => []),
    },
    $transaction: jest.fn(async (fn: any) => fn(db)),
  };
  const redis: any = { del: jest.fn(async () => undefined) };
  const audit: any = { log: jest.fn() };
  const tickets$: any = { promoteWaitlist: jest.fn(async () => undefined) };
  const svc = new EventDaysService(db, redis, audit, tickets$);
  return {
    svc,
    event,
    db,
    dates: { d1, d2, d3 },
    days: () => days,
    addTicket: (t: any) => tickets.push({ status: 'ISSUED', ...t }),
    addWait: () => waitlist.push({ id: randomUUID() }),
    tickets$,
    redis,
  };
}

describe('turning on booking by day', () => {
  it('makes one day per date, takes seats off the whole event and clears the event-wide limit', async () => {
    const w = world();
    const out = await w.svc.save(admin, 'ev1', { dayBooking: true });
    expect(w.event.dayBooking).toBe(true);
    expect(w.event.capacity).toBeNull();
    expect(out.days.map((d) => d.dayDate)).toEqual([w.dates.d1, w.dates.d2]);
    expect(out.days.map((d) => d.label)).toEqual([
      expect.stringMatching(/^Day 1/),
      expect.stringMatching(/^Day 2/),
    ]);
    expect(w.redis.del).toHaveBeenCalledWith('event-booking:ev1');
  });

  it('says why it cannot be turned on', async () => {
    expect((await world({ bookingMode: 'NONE' }).svc.get(admin, 'ev1')).cannotEnableReason).toMatch(
      /Turn on RSVP/,
    );
    const oneDay = world();
    oneDay.event.endDate = at(oneDay.dates.d1, 20);
    expect((await oneDay.svc.get(admin, 'ev1')).cannotEnableReason).toMatch(/more than one day/);
    expect(
      (await world({ ticketTiers: [{ name: 'Gold', price: 500 }] }).svc.get(admin, 'ev1'))
        .cannotEnableReason,
    ).toMatch(/Ticket types/);
    const booked = world();
    booked.addTicket({ dayId: null });
    await expect(booked.svc.save(admin, 'ev1', { dayBooking: true })).rejects.toMatchObject({
      response: { code: 'DAYS_CANNOT_ENABLE' },
    });
    expect(booked.event.dayBooking).toBe(false);
  });
});

describe('editing the days', () => {
  async function on() {
    const w = world();
    const out = await w.svc.save(admin, 'ev1', { dayBooking: true });
    return { w, out };
  }

  it('sets seats, price, hours, a name and closes a single day', async () => {
    const { w, out } = await on();
    const [a, b] = out.days;
    const saved = await w.svc.save(admin, 'ev1', {
      allDaysPrice: 150,
      days: [
        {
          id: a.id,
          label: 'Friday',
          capacity: 300,
          price: 100,
          startsAt: at(w.dates.d1, 10.5).toISOString(),
          endsAt: at(w.dates.d1, 20.5).toISOString(),
        },
        { id: b.id, label: 'Saturday', capacity: 200, price: 80, isOpen: false },
      ],
    });
    expect(saved.days.map((d) => [d.label, d.capacity, d.price, d.isOpen])).toEqual([
      ['Friday', 300, 100, true],
      ['Saturday', 200, 80, false],
    ]);
    expect(saved.allDaysPrice).toBe(150);
    expect(saved.days[1].state).toBe('CLOSED');
    expect(w.tickets$.promoteWaitlist).toHaveBeenCalled();
  });

  it('refuses days outside the event, repeated dates, and a day that ends before it starts', async () => {
    const { w, out } = await on();
    const [a, b] = out.days;
    await expect(
      w.svc.save(admin, 'ev1', {
        days: [
          {
            id: a.id,
            startsAt: at(w.dates.d3, 10).toISOString(),
            endsAt: at(w.dates.d3, 12).toISOString(),
          },
          { id: b.id },
        ],
      }),
    ).rejects.toThrow(/between the start and end dates/);
    await expect(
      w.svc.save(admin, 'ev1', {
        days: [
          { id: a.id },
          {
            startsAt: at(w.dates.d1, 12).toISOString(),
            endsAt: at(w.dates.d1, 14).toISOString(),
            label: 'Extra',
          },
        ],
      }),
    ).rejects.toThrow(/same date/);
    await expect(
      w.svc.save(admin, 'ev1', {
        days: [
          {
            id: a.id,
            startsAt: at(w.dates.d1, 12).toISOString(),
            endsAt: at(w.dates.d1, 11).toISOString(),
          },
          { id: b.id },
        ],
      }),
    ).rejects.toThrow(/end after it starts/);
  });

  it('will not lower seats below what is taken, nor remove a day people hold tickets for', async () => {
    const { w, out } = await on();
    const [a, b] = out.days;
    w.days()[0].seatsTaken = 5;
    await expect(
      w.svc.save(admin, 'ev1', { days: [{ id: a.id, capacity: 3 }, { id: b.id }] }),
    ).rejects.toThrow(/lower than the 5/);
    w.addTicket({ dayId: b.id });
    await expect(w.svc.save(admin, 'ev1', { days: [{ id: a.id }] })).rejects.toMatchObject({
      response: { code: 'DAY_HAS_TICKETS' },
    });
  });

  it('rejects a negative price and a booking window that closes before it opens', async () => {
    const { w, out } = await on();
    const [a, b] = out.days;
    await expect(
      w.svc.save(admin, 'ev1', { days: [{ id: a.id, price: -5 }, { id: b.id }] }),
    ).rejects.toThrow(/price between/);
    await expect(
      w.svc.save(admin, 'ev1', {
        days: [
          {
            id: a.id,
            rsvpOpensAt: at(w.dates.d1, 9).toISOString(),
            rsvpClosesAt: at(w.dates.d1, 8).toISOString(),
          },
          { id: b.id },
        ],
      }),
    ).rejects.toThrow(/open before it closes/);
  });
});

describe('turning it off', () => {
  it('works while no day ticket exists, and not after', async () => {
    const w = world();
    const on = await w.svc.save(admin, 'ev1', { dayBooking: true });
    w.addTicket({ dayId: on.days[0].id });
    await expect(w.svc.save(admin, 'ev1', { dayBooking: false })).rejects.toMatchObject({
      response: { code: 'DAYS_HAVE_TICKETS' },
    });

    const clean = world();
    await clean.svc.save(admin, 'ev1', { dayBooking: true });
    const off = await clean.svc.save(admin, 'ev1', { dayBooking: false });
    expect(off.dayBooking).toBe(false);
    expect(clean.days()).toHaveLength(0);
  });
});
