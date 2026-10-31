import { EventTicketsService } from './event-tickets.service';

const HOUR = 3_600_000;
const owner = { id: 'host1', role: 'BUSINESS_OWNER' };
const admin = { id: 'adm1', role: 'SUPER_ADMIN' };
// Tickets must state when sales open and close; these sit inside the event in world().
const SALES = {
  rsvpOpensAt: new Date(Date.now() + HOUR).toISOString(),
  rsvpClosesAt: new Date(Date.now() + 20 * HOUR).toISOString(),
};

function world(over: Record<string, any> = {}, actor = owner) {
  const event: any = {
    id: 'ev1',
    tenantId: 't1',
    title: 'Open Mic Night',
    status: 'ACTIVE',
    businessId: 'b1',
    venue: 'Town Hall',
    bookingMode: 'NONE',
    bookingApproval: 'APPROVED',
    capacity: null,
    seatsTaken: 0,
    checkedInCount: 0,
    rsvpOpensAt: null,
    rsvpClosesAt: null,
    maxPerUser: 1,
    cancelCutoffHours: 2,
    venueCapacity: null,
    minAge: null,
    bookingNote: null,
    checkInOpensAt: null,
    checkInClosesAt: null,
    startDate: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 27 * HOUR),
    ...over,
  };
  const db: any = {
    event: {
      findFirst: jest.fn(async () => ({ ...event })),
      update: jest.fn(async ({ data }: any) => Object.assign(event, data)),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
    },
    business: {
      findUnique: jest.fn(async () => ({ ownerId: 'host1' })),
      findFirst: jest.fn(async () => ({
        id: 'b1',
        tenantId: 't1',
        ownerId: 'host1',
        brand: null,
        staff: [],
      })),
    },
    eventTicket: { count: jest.fn(async () => over.__tickets ?? 0) },
    eventPayment: { groupBy: jest.fn(async () => []), count: jest.fn(async () => 0) },
    user: { findUnique: jest.fn(async () => ({ id: 'host1', tenantId: 't1' })) },
  };
  const redis: any = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    del: jest.fn(async () => undefined),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => undefined),
  };
  const notifications: any = { send: jest.fn(async () => ({})) };
  const audit: any = { log: jest.fn() };
  const svc = new EventTicketsService(db, redis, notifications, audit);
  jest.spyOn(svc, 'promoteWaitlist').mockResolvedValue(undefined);
  return { svc, event, db, notifications, actor };
}

describe('host booking settings', () => {
  afterEach(() => {
    delete process.env.EVENT_RSVP_AUTO_APPROVE;
  });

  it('turning RSVP on for a business event waits for approval', async () => {
    const w = world();
    const out = await w.svc.updateBooking(owner, 'ev1', {
      bookingMode: 'RSVP',
      capacity: 100,
      ...SALES,
    });
    expect(out).toMatchObject({
      bookingMode: 'RSVP',
      bookingApproval: 'PENDING',
      state: 'PENDING_APPROVAL',
      capacity: 100,
    });
  });

  it('is approved at once for platform events, platform admins and when auto-approve is on', async () => {
    const platform = world({ businessId: null }, admin);
    expect(
      (await platform.svc.updateBooking(admin, 'ev1', { bookingMode: 'RSVP', ...SALES }))
        .bookingApproval,
    ).toBe('APPROVED');

    const byAdmin = world({}, admin);
    expect(
      (await byAdmin.svc.updateBooking(admin, 'ev1', { bookingMode: 'RSVP', ...SALES }))
        .bookingApproval,
    ).toBe('APPROVED');

    process.env.EVENT_RSVP_AUTO_APPROVE = 'true';
    const auto = world();
    expect(
      (await auto.svc.updateBooking(owner, 'ev1', { bookingMode: 'RSVP', ...SALES }))
        .bookingApproval,
    ).toBe('APPROVED');
  });

  it('will not drop capacity below the seats already taken', async () => {
    const w = world({ bookingMode: 'RSVP', capacity: 100, seatsTaken: 40 });
    await expect(w.svc.updateBooking(owner, 'ev1', { capacity: 30 })).rejects.toThrow(
      /already taken/,
    );
    const ok = await w.svc.updateBooking(owner, 'ev1', { capacity: 40 });
    expect(ok.capacity).toBe(40);
  });

  it('checks the numbers and times make sense together', async () => {
    const w = world();
    await expect(
      w.svc.updateBooking(owner, 'ev1', { capacity: 500, venueCapacity: 300 }),
    ).rejects.toThrow(/more than the venue/);
    await expect(
      w.svc.updateBooking(owner, 'ev1', {
        rsvpOpensAt: new Date(Date.now() + 2 * HOUR).toISOString(),
        rsvpClosesAt: new Date(Date.now() + HOUR).toISOString(),
      }),
    ).rejects.toThrow(/open before they close/);
    await expect(
      w.svc.updateBooking(owner, 'ev1', {
        rsvpClosesAt: new Date(Date.now() + 40 * HOUR).toISOString(),
      }),
    ).rejects.toThrow(/past the end/);
  });

  it('will not turn RSVP on until the host says when ticket sales open and close', async () => {
    const w = world();
    await expect(w.svc.updateBooking(owner, 'ev1', { bookingMode: 'RSVP' })).rejects.toThrow(
      /when ticket sales open and when they close/,
    );
    await expect(
      w.svc.updateBooking(owner, 'ev1', {
        bookingMode: 'RSVP',
        rsvpOpensAt: SALES.rsvpOpensAt,
      }),
    ).rejects.toThrow(/when ticket sales open and when they close/);
  });

  it('will not switch RSVP off while people hold tickets', async () => {
    const w = world({ bookingMode: 'RSVP', __tickets: 3 });
    await expect(w.svc.updateBooking(owner, 'ev1', { bookingMode: 'NONE' })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'HAS_TICKETS' }),
    });
    const free = world({ bookingMode: 'RSVP', __tickets: 0 });
    expect((await free.svc.updateBooking(owner, 'ev1', { bookingMode: 'NONE' })).bookingMode).toBe(
      'NONE',
    );
  });

  it('lets a null clear an optional setting and leaves unmentioned ones alone', async () => {
    const w = world({ bookingMode: 'RSVP', capacity: 50, minAge: 18, bookingNote: 'Bring ID' });
    const out = await w.svc.updateBooking(owner, 'ev1', { minAge: null, bookingNote: '  ' });
    expect(out).toMatchObject({ minAge: null, bookingNote: null, capacity: 50 });
  });

  it('keeps people outside the business out', async () => {
    const w = world();
    w.db.business.findFirst.mockResolvedValue({
      id: 'b1',
      tenantId: 't1',
      ownerId: 'someone-else',
      brand: null,
      staff: [],
    });
    await expect(
      w.svc.updateBooking({ id: 'stranger', role: 'USER' }, 'ev1', { capacity: 5 }),
    ).rejects.toThrow(/do not have access/);
  });
});

describe('moderation', () => {
  it('approving tells the host', async () => {
    const w = world({ bookingMode: 'RSVP', bookingApproval: 'PENDING' });
    w.db.event.findFirst.mockResolvedValue({
      ...w.event,
      business: { ownerId: 'host1' },
    });
    await w.svc.decide('adm1', 'ev1', true);
    expect(w.event.bookingApproval).toBe('APPROVED');
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
    expect(w.notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'host1', type: 'EVENT_APPROVAL' }),
    );
  });

  it('refuses to decide on an event that is not taking RSVPs', async () => {
    const w = world({ bookingMode: 'NONE' });
    await expect(w.svc.decide('adm1', 'ev1', true)).rejects.toThrow(/not taking RSVPs/);
  });
});
