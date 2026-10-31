import { EventTicketsService } from './event-tickets.service';

const HOUR = 3_600_000;
const owner = { id: 'host1', role: 'BUSINESS_OWNER' };
const admin = { id: 'adm1', role: 'SUPER_ADMIN' };

function world(over: Record<string, any> = {}) {
  const event: any = {
    id: 'ev1',
    tenantId: 't1',
    title: 'Open Mic Night',
    status: 'ACTIVE',
    businessId: 'b1',
    venue: 'Town Hall',
    bookingMode: 'RSVP',
    bookingApproval: 'PENDING',
    bookingRejectReason: null,
    bookingReviewedAt: null,
    bookingResubmitCount: 0,
    capacity: null,
    seatsTaken: 0,
    checkedInCount: 0,
    startDate: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 27 * HOUR),
    ...over,
  };
  const tickets = [
    {
      id: 't-1',
      code: 'AAAAAA',
      holderName: 'Asha Nair',
      isGuest: false,
      status: 'ISSUED',
      source: 'home',
      issuedAt: new Date(),
      checkedInAt: null,
      userId: 'u1',
      user: { name: 'Asha Nair', email: 'asha@example.com', phone: '9876543210' },
    },
    {
      id: 't-2',
      code: 'BBBBBB',
      holderName: 'Ravi (guest)',
      isGuest: true,
      status: 'ISSUED',
      source: 'home',
      issuedAt: new Date(),
      checkedInAt: null,
      userId: 'u1',
      user: { name: 'Asha Nair', email: 'asha@example.com', phone: '9876543210' },
    },
  ];
  const db: any = {
    event: {
      findFirst: jest.fn(async () => ({ ...event, business: { ownerId: 'host1' } })),
      update: jest.fn(async ({ data }: any) => {
        const next: any = { ...data };
        if (data.bookingResubmitCount?.increment) {
          next.bookingResubmitCount = event.bookingResubmitCount + data.bookingResubmitCount.increment;
        }
        return Object.assign(event, next);
      }),
    },
    business: {
      findFirst: jest.fn(async () => ({
        id: 'b1',
        tenantId: 't1',
        ownerId: 'host1',
        brand: null,
        staff: [],
      })),
    },
    eventTicket: {
      findMany: jest.fn(async () => tickets),
      count: jest.fn(async () => tickets.length),
    },
    eventPayment: { groupBy: jest.fn(async () => []), count: jest.fn(async () => 0) },
    user: {
      findUnique: jest.fn(async () => ({ id: 'host1', tenantId: 't1' })),
      findMany: jest.fn(async () => [{ id: 'u1', profession: 'Teacher' }]),
    },
    customer: {
      findMany: jest.fn(async () => [{ userId: 'u1', city: 'Kochi', district: 'Ernakulam' }]),
    },
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
  return { svc, event, db, notifications, audit };
}

describe('approving and rejecting an event for RSVP', () => {
  it('will not reject without a reason, so the host is never left guessing', async () => {
    const w = world();
    await expect(w.svc.decide('adm1', 'ev1', false)).rejects.toThrow(/Say why/);
    await expect(w.svc.decide('adm1', 'ev1', false, '  no ')).rejects.toThrow(/Say why/);
    expect(w.event.bookingApproval).toBe('PENDING');
  });

  it('keeps the reason, tells the host, and a later approval clears it', async () => {
    const w = world();
    await w.svc.decide('adm1', 'ev1', false, 'The venue address is missing');
    expect(w.event).toMatchObject({
      bookingApproval: 'REJECTED',
      bookingRejectReason: 'The venue address is missing',
    });
    expect(w.event.bookingReviewedAt).toBeInstanceOf(Date);
    const sent = w.notifications.send.mock.calls[0][0];
    expect(sent.message ?? sent.body ?? JSON.stringify(sent)).toMatch(/venue address is missing/);

    await w.svc.decide('adm1', 'ev1', true);
    expect(w.event).toMatchObject({ bookingApproval: 'APPROVED', bookingRejectReason: null });
  });
});

describe('sending a rejected event for approval again', () => {
  it('moves it back to pending and counts the attempt', async () => {
    const w = world({ bookingApproval: 'REJECTED', bookingRejectReason: 'Add a poster' });
    const out = await w.svc.resubmit(owner, 'ev1');
    expect(w.event.bookingApproval).toBe('PENDING');
    expect(w.event.bookingResubmitCount).toBe(1);
    expect(out).toBeTruthy();
  });

  it('only works for an event that was rejected, and stops after five tries', async () => {
    await expect(world().svc.resubmit(owner, 'ev1')).rejects.toThrow(/was not approved/);
    const tired = world({ bookingApproval: 'REJECTED', bookingResubmitCount: 5 });
    await expect(tired.svc.resubmit(owner, 'ev1')).rejects.toThrow(/5 times/);
  });
});

describe('what a host may see about attendees', () => {
  it('shows name, profession and place, and no contact details', async () => {
    const w = world();
    const out = await w.svc.attendees(owner, 'ev1', {});
    const [asha, guest] = out.data;
    expect(asha).toMatchObject({ holderName: 'Asha Nair', profession: 'Teacher', place: 'Kochi' });
    expect(asha.registrant).toEqual({ name: 'Asha Nair' });
    expect(JSON.stringify(out)).not.toMatch(/asha@example\.com|9876543210/);
    // A guest is somebody else, so the registrant's own profession and place are not theirs.
    expect(guest).toMatchObject({ isGuest: true, profession: null, place: null });
  });

  it('gives the super admin the contact details as well', async () => {
    const w = world();
    const out = await w.svc.attendees(admin, 'ev1', {});
    expect(out.data[0].registrant).toMatchObject({
      email: 'asha@example.com',
      phone: '9876543210',
    });
  });

  it('keeps contact details out of the host CSV but not the super admin one', async () => {
    const host = await world().svc.attendeesCsv(owner, 'ev1');
    expect(host.split('\r\n')[0]).toBe(
      '"Ticket code","Name","Profession","Place","Guest","Status","Registered by","Source","RSVP time","Check-in time"',
    );
    expect(host).not.toMatch(/asha@example\.com|9876543210/);
    const platform = await world().svc.attendeesCsv(admin, 'ev1');
    expect(platform).toMatch(/"Email","Phone"/);
    expect(platform).toMatch(/asha@example\.com/);
  });
});
