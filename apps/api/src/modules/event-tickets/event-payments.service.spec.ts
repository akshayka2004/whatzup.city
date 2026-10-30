import { randomUUID } from 'crypto';
import { EventPaymentsService } from './event-payments.service';
import { EventTicketsService } from './event-tickets.service';

const HOUR = 3_600_000;
const owner = { id: 'host1', role: 'BUSINESS_OWNER' };

/** In-memory stand-in for the tables a paid RSVP touches: events, tickets, payments, the log. */
function world(over: Record<string, any> = {}) {
  const event: any = {
    id: 'ev1',
    tenantId: 't1',
    title: 'Gala Night',
    status: 'ACTIVE',
    businessId: 'b1',
    bookingMode: 'RSVP',
    bookingApproval: 'APPROVED',
    capacity: 3,
    seatsTaken: 0,
    rsvpOpensAt: null,
    rsvpClosesAt: null,
    startDate: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 27 * HOUR),
    maxPerUser: 4,
    cancelCutoffHours: 2,
    ticketType: 'PAID',
    ticketPrice: 500,
    ticketTiers: null,
    payEnabled: true,
    payWindowHours: 24,
    payUpiId: 'host@okbank',
    payeeName: 'Gala Host',
    payPhone: '9876543210',
    payQrImage: null,
    ...over,
  };
  const tickets: any[] = [];
  const payments: any[] = [];
  const logs: any[] = [];
  const users: Record<string, any> = {
    u1: { id: 'u1', name: 'Asha', tenantId: 't1', email: 'a@x.in', phone: null },
    u2: { id: 'u2', name: 'Ravi', tenantId: 't1', email: 'r@x.in', phone: null },
  };

  const match = (row: any, where: any = {}) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('in' in v) return v.in.includes(row[k]);
        if ('lte' in v) return row[k] <= v.lte;
        return true;
      }
      return row[k] === v;
    });
  const copy = (x: any) => ({ ...x });
  const hydrate = (p: any) => ({
    ...p,
    user: users[p.userId],
    event,
    tickets: tickets.filter((t) => t.paymentId === p.id),
  });

  const tx: any = {
    $queryRaw: jest.fn(async () => []),
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
    event: {
      findFirst: jest.fn(async () => ({ ...event })),
      findUnique: jest.fn(async () => ({ ...event })),
    },
    eventTicket: {
      findMany: jest.fn(async ({ where }: any) => tickets.filter((t) => match(t, where)).map(copy)),
      create: jest.fn(async ({ data }: any) => {
        const t = {
          id: randomUUID(),
          status: 'ISSUED',
          issuedAt: new Date(),
          checkedInAt: null,
          paymentId: null,
          ...data,
        };
        tickets.push(t);
        return copy(t);
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let n = 0;
        for (const t of tickets) {
          if (match(t, where)) {
            Object.assign(t, data);
            n++;
          }
        }
        return { count: n };
      }),
    },
    eventPayment: {
      create: jest.fn(async ({ data }: any) => {
        const p = {
          id: randomUUID(),
          status: 'PENDING',
          resubmitCount: 0,
          utr: null,
          proofImage: null,
          decisionNote: null,
          submittedAt: null,
          createdAt: new Date(),
          ...data,
        };
        payments.push(p);
        return copy(p);
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const p = payments.find((x) => match(x, where));
        return p ? hydrate(p) : null;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const p = payments.find((x) => x.id === where.id);
        return p ? hydrate(p) : null;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        payments.filter((p) => match(p, where)).map(hydrate),
      ),
      count: jest.fn(async ({ where }: any) => payments.filter((p) => match(p, where)).length),
      groupBy: jest.fn(async () => []),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let n = 0;
        for (const p of payments) {
          if (!match(p, where)) continue;
          if (
            data.utr &&
            payments.some(
              (o) =>
                o.id !== p.id && o.utr === data.utr && ['SUBMITTED', 'APPROVED'].includes(o.status),
            )
          ) {
            throw Object.assign(new Error('unique'), { code: 'P2002' });
          }
          const { resubmitCount, ...rest } = data;
          Object.assign(p, rest);
          if (resubmitCount?.increment) p.resubmitCount += resubmitCount.increment;
          n++;
        }
        return { count: n };
      }),
    },
    eventPaymentLog: {
      create: jest.fn(async ({ data }: any) => {
        logs.push(data);
      }),
    },
  };
  const db: any = {
    ...tx,
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    user: {
      findFirst: jest.fn(async ({ where }: any) => users[where.id] ?? null),
      findUnique: jest.fn(async () => ({ id: 'host1', tenantId: 't1' })),
    },
    business: {
      findFirst: jest.fn(async () => ({
        id: 'b1',
        tenantId: 't1',
        ownerId: 'host1',
        brand: null,
        staff: [],
      })),
      findUnique: jest.fn(async () => ({ ownerId: 'host1' })),
    },
    eventWaitlist: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
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
  const storage: any = { createSignedDownloadUrl: jest.fn(async () => 'https://signed/proof') };
  const tix = new EventTicketsService(db, redis, notifications, audit);
  const pay = new EventPaymentsService(db, redis, storage, audit, tix);
  return { tix, pay, event, tickets, payments, logs, notifications, audit, db };
}

const flush = () => new Promise((r) => setImmediate(r));
const UTR = '412345678901';

describe('paid RSVP', () => {
  it('holds the seat, makes the tickets wait for payment and records the amount', async () => {
    const w = world();
    const out = await w.tix.rsvp('u1', 'ev1', { guests: ['Priya'] });
    expect(out.tickets.map((t) => t.status)).toEqual(['PENDING', 'PENDING']);
    expect(out.payment).toMatchObject({ status: 'PENDING', amount: 1000, seats: 2 });
    expect(w.event.seatsTaken).toBe(2);
    expect(w.logs.map((l) => l.action)).toEqual(['CREATED']);
    await flush();
    expect(w.notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', type: 'EVENT_PAYMENT' }),
    );
  });

  it('keeps free events exactly as they were: ticket issued at once, no payment', async () => {
    const w = world({ ticketType: 'FREE', payEnabled: false });
    const out = await w.tix.rsvp('u1', 'ev1', {});
    expect(out.tickets[0].status).toBe('ISSUED');
    expect(out.payment).toBeNull();
    expect(w.payments).toHaveLength(0);
  });

  it('asks for a ticket type on tiered events and prices by the chosen one', async () => {
    const w = world({
      ticketTiers: [
        { name: 'Gold', price: 800 },
        { name: 'Free pass', price: 0 },
      ],
    });
    await expect(w.tix.rsvp('u1', 'ev1', {})).rejects.toThrow(/Choose a ticket type/);
    await expect(w.tix.rsvp('u1', 'ev1', { tier: 'Platinum' })).rejects.toThrow(/not available/);
    expect(w.event.seatsTaken).toBe(0);

    const gold = await w.tix.rsvp('u1', 'ev1', { tier: 'gold' });
    expect(gold.payment).toMatchObject({ amount: 800, tier: 'Gold' });

    const free = await w.tix.rsvp('u2', 'ev1', { tier: 'Free pass' });
    expect(free.tickets[0].status).toBe('ISSUED');
    expect(free.payment).toBeNull();
  });

  it('will not start a second payment while one is still open', async () => {
    const w = world();
    await w.tix.rsvp('u1', 'ev1', {});
    await expect(w.tix.rsvp('u1', 'ev1', { guests: ['Priya'] })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENT_PENDING' }),
    });
    expect(w.event.seatsTaken).toBe(1);
  });

  it('a held seat counts against capacity, so nobody can take it meanwhile', async () => {
    const w = world({ capacity: 1 });
    await w.tix.rsvp('u1', 'ev1', {});
    await expect(w.tix.rsvp('u2', 'ev1', {})).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVENT_FULL' }),
    });
  });
});

describe('proof and verification', () => {
  async function held() {
    const w = world();
    const r = await w.tix.rsvp('u1', 'ev1', {});
    return { w, pid: r.payment!.id };
  }

  it('rejects a reference number that is not 10 to 22 letters and digits', async () => {
    const { w, pid } = await held();
    await expect(w.pay.submitProof('u1', pid, { utr: '12345' })).rejects.toThrow(/reference/);
    await expect(w.pay.submitProof('u1', pid, { utr: '1234 5678 90!!' })).rejects.toThrow(
      /reference/,
    );
  });

  it('takes the proof, tells the host, and keeps the seat held', async () => {
    const { w, pid } = await held();
    const out = await w.pay.submitProof('u1', pid, { utr: '4123 4567 8901' });
    expect(out).toMatchObject({ status: 'SUBMITTED', utr: UTR });
    expect(w.logs.map((l) => l.action)).toEqual(['CREATED', 'PROOF_SUBMITTED']);
    expect(w.event.seatsTaken).toBe(1);
    await flush();
    expect(w.notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'host1', type: 'EVENT_PAYMENT' }),
    );
  });

  it('refuses a reference that already backs another payment', async () => {
    const { w, pid } = await held();
    await w.pay.submitProof('u1', pid, { utr: UTR });
    const r2 = await w.tix.rsvp('u2', 'ev1', {});
    await expect(w.pay.submitProof('u2', r2.payment!.id, { utr: UTR })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'UTR_USED' }),
    });
  });

  it("will not show or accept someone else's payment", async () => {
    const { w, pid } = await held();
    await expect(w.pay.mine('u2', pid)).rejects.toThrow(/not found/i);
    await expect(w.pay.submitProof('u2', pid, { utr: UTR })).rejects.toThrow(/not found/i);
  });

  it("only accepts a screenshot that sits in the payer's own payment folder", async () => {
    const { w, pid } = await held();
    await expect(
      w.pay.submitProof('u1', pid, {
        utr: UTR,
        proofBucket: 'verification-documents',
        proofPath: 't2/payment/x/other-tenant.png',
      }),
    ).rejects.toThrow(/screenshot/);
    const ok = await w.pay.submitProof('u1', pid, {
      utr: UTR,
      proofBucket: 'verification-documents',
      proofPath: 't1/payment/ev1/proof.png',
    });
    expect(ok.hasScreenshot).toBe(true);
  });

  it('approving issues the tickets and logs who did it', async () => {
    const { w, pid } = await held();
    await w.pay.submitProof('u1', pid, { utr: UTR });
    await w.pay.approve(owner, 'ev1', pid);
    expect(w.tickets.map((t) => t.status)).toEqual(['ISSUED']);
    expect(w.payments[0]).toMatchObject({ status: 'APPROVED', decidedBy: 'host1' });
    expect(w.logs.at(-1)).toMatchObject({ action: 'APPROVED', actorRole: 'HOST' });
    expect(w.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EVENT_PAYMENT_APPROVED' }),
    );
    await expect(w.pay.approve(owner, 'ev1', pid)).rejects.toThrow(/already approved/);
  });

  it('cannot approve a payment that has no proof yet', async () => {
    const { w, pid } = await held();
    await expect(w.pay.approve(owner, 'ev1', pid)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENT_NOT_SUBMITTED' }),
    });
  });

  it('a correction request keeps the seat, clears the old reference and extends the time', async () => {
    const { w, pid } = await held();
    await w.pay.submitProof('u1', pid, { utr: UTR });
    const before = w.payments[0].expiresAt as Date;
    w.payments[0].expiresAt = new Date(Date.now() + HOUR);
    const out = await w.pay.reject(owner, 'ev1', pid, {
      reason: 'Reference does not match our bank',
      allowResubmit: true,
    });
    expect(out).toEqual({ rejected: false, resubmitRequested: true });
    expect(w.payments[0]).toMatchObject({
      status: 'PENDING',
      utr: null,
      resubmitCount: 1,
      decisionNote: 'Reference does not match our bank',
    });
    expect(+w.payments[0].expiresAt).toBeGreaterThan(+before - HOUR);
    expect(w.tickets[0].status).toBe('PENDING');
    expect(w.event.seatsTaken).toBe(1);
    // the same reference can now be corrected and sent again
    const again = await w.pay.submitProof('u1', pid, { utr: 'ABCD123456789' });
    expect(again.status).toBe('SUBMITTED');
  });

  it('a final rejection cancels the tickets and gives the seat back', async () => {
    const { w, pid } = await held();
    await w.pay.submitProof('u1', pid, { utr: UTR });
    const promote = jest.spyOn(w.tix, 'promoteWaitlist').mockResolvedValue(undefined);
    const out = await w.pay.reject(owner, 'ev1', pid, { reason: 'No such payment received' });
    expect(out).toEqual({ rejected: true, resubmitRequested: false });
    expect(w.tickets[0].status).toBe('CANCELLED');
    expect(w.event.seatsTaken).toBe(0);
    expect(w.logs.at(-1)).toMatchObject({ action: 'REJECTED' });
    expect(promote).toHaveBeenCalledWith('ev1');
    await flush();
    expect(w.notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', type: 'EVENT_PAYMENT_REJECTED' }),
    );
  });

  it('logs a platform admin acting on a payment as ADMIN', async () => {
    const { w, pid } = await held();
    await w.pay.submitProof('u1', pid, { utr: UTR });
    await w.pay.approve({ id: 'adm1', role: 'SUPER_ADMIN' }, 'ev1', pid);
    expect(w.logs.at(-1)).toMatchObject({ action: 'APPROVED', actorRole: 'ADMIN' });
  });
});

describe('time running out and giving up', () => {
  it('releases a seat whose payment window passed and tells the attendee', async () => {
    const w = world();
    const r = await w.tix.rsvp('u1', 'ev1', {});
    const promote = jest.spyOn(w.tix, 'promoteWaitlist').mockResolvedValue(undefined);
    expect(await w.pay.expirePayment(r.payment!.id)).toBe(false); // still inside its window

    w.payments[0].expiresAt = new Date(Date.now() - 1000);
    expect(await w.pay.expirePayment(r.payment!.id)).toBe(true);
    expect(w.payments[0].status).toBe('EXPIRED');
    expect(w.tickets[0].status).toBe('CANCELLED');
    expect(w.event.seatsTaken).toBe(0);
    expect(w.logs.at(-1)).toMatchObject({ action: 'EXPIRED', actorRole: 'SYSTEM' });
    expect(promote).toHaveBeenCalledWith('ev1');
    // a second sweep finds nothing to do
    expect(await w.pay.expirePayment(r.payment!.id)).toBe(false);
    expect(w.event.seatsTaken).toBe(0);
  });

  it('never expires a payment the host is already checking', async () => {
    const w = world();
    const r = await w.tix.rsvp('u1', 'ev1', {});
    await w.pay.submitProof('u1', r.payment!.id, { utr: UTR });
    w.payments[0].expiresAt = new Date(Date.now() - HOUR);
    expect(await w.pay.expirePayment(r.payment!.id)).toBe(false);
    expect(w.payments[0].status).toBe('SUBMITTED');
    expect(w.event.seatsTaken).toBe(1);
  });

  it('rejects proof sent after the window and frees the seat', async () => {
    const w = world();
    const r = await w.tix.rsvp('u1', 'ev1', {});
    w.payments[0].expiresAt = new Date(Date.now() - 1000);
    jest.spyOn(w.tix, 'promoteWaitlist').mockResolvedValue(undefined);
    await expect(w.pay.submitProof('u1', r.payment!.id, { utr: UTR })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENT_EXPIRED' }),
    });
    expect(w.event.seatsTaken).toBe(0);
  });

  it('lets the attendee give the seat back, and tells the host if they had already sent proof', async () => {
    const w = world();
    const r = await w.tix.rsvp('u1', 'ev1', {});
    await w.pay.submitProof('u1', r.payment!.id, { utr: UTR });
    jest.spyOn(w.tix, 'promoteWaitlist').mockResolvedValue(undefined);
    await w.notifications.send.mockClear();
    await w.pay.cancel('u1', r.payment!.id);
    expect(w.payments[0].status).toBe('CANCELLED');
    expect(w.event.seatsTaken).toBe(0);
    await flush();
    expect(w.notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'host1', title: expect.stringMatching(/cancelled/i) }),
    );
    await expect(w.pay.cancel('u1', r.payment!.id)).rejects.toThrow(/already closed/);
  });
});

describe('payment settings', () => {
  const settings = (over: Record<string, any> = {}) => {
    const w = world({
      bookingMode: 'RSVP',
      payEnabled: false,
      payUpiId: null,
      payPhone: null,
      payeeName: null,
      venueCapacity: null,
      minAge: null,
      bookingNote: null,
      checkInOpensAt: null,
      checkInClosesAt: null,
      checkedInCount: 0,
      ...over,
    });
    (w.db.event as any).update = jest.fn(async ({ data }: any) => Object.assign(w.event, data));
    return w;
  };

  it('needs a paid ticket price, a UPI ID, a name and a phone before payments can open', async () => {
    const free = settings({ ticketType: 'FREE' });
    await expect(free.tix.updateBooking(owner, 'ev1', { payEnabled: true })).rejects.toThrow(
      /paid ticket price/,
    );
    const w = settings();
    await expect(w.tix.updateBooking(owner, 'ev1', { payEnabled: true })).rejects.toThrow(/UPI ID/);
    await expect(
      w.tix.updateBooking(owner, 'ev1', { payEnabled: true, payUpiId: 'not-a-upi' }),
    ).rejects.toThrow(/does not look right/);
    await expect(
      w.tix.updateBooking(owner, 'ev1', { payEnabled: true, payUpiId: 'host@okbank' }),
    ).rejects.toThrow(/name shown/);
    await expect(
      w.tix.updateBooking(owner, 'ev1', {
        payEnabled: true,
        payUpiId: 'host@okbank',
        payeeName: 'Gala Host',
        payPhone: '12345',
      }),
    ).rejects.toThrow(/10-digit/);

    const ok = await w.tix.updateBooking(owner, 'ev1', {
      payEnabled: true,
      payUpiId: 'host@okbank',
      payeeName: 'Gala Host',
      payPhone: '+91 98765 43210',
    });
    expect(ok).toMatchObject({ payEnabled: true, payPhone: '9876543210' });
    expect(w.event.payConfirmedAt).toBeInstanceOf(Date);
    expect(w.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EVENT_PAYMENTS_ENABLED' }),
    );
  });

  it('asks for the QR photo only after payments are confirmed', async () => {
    const w = settings();
    await expect(
      w.tix.updateBooking(owner, 'ev1', { payQrImage: 'https://cdn.example.com/qr.png' }),
    ).rejects.toThrow(/Confirm that you accept payments first/);
    await w.tix.updateBooking(owner, 'ev1', {
      payEnabled: true,
      payUpiId: 'host@okbank',
      payeeName: 'Gala Host',
      payPhone: '9876543210',
    });
    const out = await w.tix.updateBooking(owner, 'ev1', {
      payQrImage: 'https://cdn.example.com/qr.png',
    });
    expect(out.payQrImage).toBe('https://cdn.example.com/qr.png');
    await expect(
      w.tix.updateBooking(owner, 'ev1', { payQrImage: 'javascript:alert(1)' }),
    ).rejects.toThrow(/not valid/);
  });

  it('will not swap the payee or switch payments off while people are paying or after verified payments', async () => {
    const w = settings({
      payEnabled: true,
      payUpiId: 'host@okbank',
      payeeName: 'Gala Host',
      payPhone: '9876543210',
    });
    w.payments.push({ id: 'p1', eventId: 'ev1', status: 'SUBMITTED' });
    await expect(
      w.tix.updateBooking(owner, 'ev1', { payUpiId: 'other@okbank' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENTS_IN_PROGRESS' }),
    });
    await expect(w.tix.updateBooking(owner, 'ev1', { payEnabled: false })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENTS_IN_PROGRESS' }),
    });

    w.payments[0].status = 'APPROVED';
    await expect(w.tix.updateBooking(owner, 'ev1', { payEnabled: false })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'HAS_PAYMENTS' }),
    });
    // changing the payee after everyone is verified is fine
    const ok = await w.tix.updateBooking(owner, 'ev1', { payUpiId: 'other@okbank' });
    expect(ok.payUpiId).toBe('other@okbank');
  });
});
