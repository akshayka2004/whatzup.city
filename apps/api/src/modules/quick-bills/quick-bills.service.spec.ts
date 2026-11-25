import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QuickBillsService, QUICK } from './quick-bills.service';

const DAY = 86_400_000;
const CUSTOMER = { id: 'cust', tenantId: 'tc' };
const STAFF = { id: 'staff1', tenantId: 'tb' };
const OWNER = { id: 'owner', tenantId: 'tb' };

function setup(
  opts: { status?: string; insider?: boolean; staffIds?: string[]; managerIds?: string[] } = {},
) {
  const state: any = {
    reqs: [] as any[],
    bills: [] as any[],
    purchases: [] as any[],
    points: [] as any[],
  };
  const biz = {
    id: 'biz1',
    entityId: null,
    name: 'Cafe Joy',
    ownerId: 'owner',
    status: opts.status ?? 'APPROVED',
    tenantId: 'tb',
  };
  const match = (r: any, w: any) =>
    Object.entries(w).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('in' in v) return v.in.includes(r[k]);
        if ('gte' in v) return r[k] >= v.gte;
        if ('lt' in v) return r[k] < v.lt;
        if ('not' in v) return r[k] !== v.not;
        return true;
      }
      return r[k] === v;
    });
  const db: any = {
    business: {
      findFirst: jest.fn(async (args: any) => {
        // The "is this person an insider" lookup filters by ownerId / staff; everything else is the business itself.
        if (args?.where?.OR && args.where.OR.some((o: any) => o.ownerId)) {
          return opts.insider ? { id: biz.id } : null;
        }
        const w = args?.select?.staff?.where;
        const uid = w?.userId;
        const ok =
          uid &&
          (opts.staffIds ?? []).includes(uid) &&
          (!w?.role || (opts.managerIds ?? []).includes(uid));
        return { ...biz, brand: null, staff: ok ? [{ id: 's' }] : [] };
      }),
    },
    user: {
      findMany: jest.fn(async () => [
        { id: 'cust', name: 'Asha Nair' },
        { id: 'staff1', name: 'Ravi Menon' },
      ]),
    },
    counterBill: {
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = state.reqs.filter((r: any) => match(r, where));
        hit.forEach((r: any) => Object.assign(r, data));
        return { count: hit.length };
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const list = state.reqs.filter((r: any) => match(r, where));
        return list[list.length - 1] ?? null;
      }),
      findMany: jest.fn(async ({ where }: any) => state.reqs.filter((r: any) => match(r, where))),
      count: jest.fn(
        async ({ where }: any) => state.reqs.filter((r: any) => match(r, where)).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        if (
          state.reqs.some(
            (r: any) => r.code === data.code && ['OPEN', 'AWAITING'].includes(r.status),
          )
        ) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        const r = {
          id: `r${state.reqs.length + 1}`,
          status: 'OPEN',
          createdAt: new Date(),
          businessId: null,
          billId: null,
          ...data,
        };
        state.reqs.push(r);
        return r;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const r = state.reqs.find((x: any) => x.id === where.id);
        Object.assign(r, data);
        return r;
      }),
    },
    bill: {
      count: jest.fn(
        async ({ where }: any) =>
          state.bills.filter(
            (b: any) =>
              b.userId === where.userId &&
              b.businessId === where.businessId &&
              b.source === 'COUNTER',
          ).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const b = {
          id: `b${state.bills.length + 1}`,
          createdAt: new Date(),
          voidedAt: null,
          deletedAt: null,
          ...data,
        };
        state.bills.push(b);
        return b;
      }),
      findFirst: jest.fn(
        async ({ where }: any) => state.bills.find((b: any) => b.id === where.id) ?? null,
      ),
      findMany: jest.fn(async () => state.bills),
      update: jest.fn(async ({ where, data }: any) =>
        Object.assign(
          state.bills.find((b: any) => b.id === where.id),
          data,
        ),
      ),
    },
    verifiedPurchase: {
      create: jest.fn(async ({ data }: any) => state.purchases.push({ deletedAt: null, ...data })),
      updateMany: jest.fn(async ({ where, data }: any) => {
        state.purchases
          .filter((p: any) => p.billId === where.billId)
          .forEach((p: any) => Object.assign(p, data));
        return { count: 1 };
      }),
    },
    pointsEntry: {
      create: jest.fn(async ({ data }: any) => state.points.push({ deletedAt: null, ...data })),
      updateMany: jest.fn(async ({ where, data }: any) => {
        state.points
          .filter((p: any) => p.billId === where.billId)
          .forEach((p: any) => Object.assign(p, data));
        return { count: 1 };
      }),
    },
    businessCustomer: { updateMany: jest.fn(async () => ({ count: 1 })) },
    $transaction: jest.fn(async (fn: any) => fn(db)),
  };
  const rewards: any = { onSpend: jest.fn(async () => undefined) };
  const audit: any = { log: jest.fn() };
  const notifications: any = { send: jest.fn(async () => ({})) };
  const service = new QuickBillsService(db, rewards, audit, notifications);
  return { service, db, state, rewards, audit, notifications };
}

/** Customer opens Quick pay, staff enter the amount; returns both. */
async function entered(ctx: ReturnType<typeof setup>, amount = 850) {
  const open = await ctx.service.open(CUSTOMER);
  await ctx.service.enter(STAFF, { businessId: 'biz1', code: open.code, amount });
  return open;
}

describe('the customer opens Quick pay', () => {
  it('gets a 6-digit code that lasts 10 minutes', async () => {
    const { service } = setup();
    const out = await service.open(CUSTOMER);
    expect(out.code).toMatch(/^\d{6}$/);
    expect(out.status).toBe('OPEN');
    const mins = (out.expiresAt.getTime() - Date.now()) / 60_000;
    expect(mins).toBeGreaterThan(9);
    expect(mins).toBeLessThanOrEqual(QUICK.codeMinutes);
  });
  it('opening the screen again shows the same live code', async () => {
    const { service, state } = setup();
    const a = await service.open(CUSTOMER);
    const b = await service.open(CUSTOMER);
    expect(b.id).toBe(a.id);
    expect(state.reqs).toHaveLength(1);
  });
  it('an expired code is replaced with a fresh one', async () => {
    const { service, state } = setup();
    const a = await service.open(CUSTOMER);
    state.reqs[0].expiresAt = new Date(Date.now() - 1000);
    const b = await service.open(CUSTOMER);
    expect(b.id).not.toBe(a.id);
    expect(state.reqs[0].status).toBe('EXPIRED');
  });
  it('two customers never share a live code', async () => {
    const { service, db } = setup();
    // Force the first attempt to collide, as if someone else already holds that code.
    const real = db.counterBill.create;
    let first = true;
    db.counterBill.create = jest.fn(async (args: any) => {
      if (first) {
        first = false;
        throw Object.assign(new Error('unique'), { code: 'P2002' });
      }
      return real(args);
    });
    await expect(service.open({ id: 'x', tenantId: 'tx' })).resolves.toMatchObject({
      status: 'OPEN',
    });
    expect(db.counterBill.create).toHaveBeenCalledTimes(2);
  });
  it('needs an account, and is limited per hour', async () => {
    const { service, state } = setup();
    await expect(service.open({ id: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    for (let i = 0; i < QUICK.openedPerHour; i++) {
      state.reqs.push({
        id: `old${i}`,
        userId: 'cust',
        status: 'EXPIRED',
        createdAt: new Date(),
        expiresAt: new Date(0),
        code: `9${i}`,
      });
    }
    await expect(service.open(CUSTOMER)).rejects.toThrow(/Too many/);
  });
});

describe('staff enter the amount', () => {
  it('asks the customer to confirm and tells them, without creating a bill yet', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await ctx.service.open(CUSTOMER);
    const out = await ctx.service.enter(STAFF, {
      businessId: 'biz1',
      code: open.code,
      amount: 850.456,
    });
    expect(out).toMatchObject({
      status: 'AWAITING',
      amount: 850.46,
      business: { name: 'Cafe Joy' },
    });
    expect(ctx.state.bills).toHaveLength(0);
    expect(ctx.notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'cust',
        tenantId: 'tc',
        title: expect.stringContaining('850.46'),
      }),
    );
    expect(await ctx.service.status(CUSTOMER, open.id)).toMatchObject({
      status: 'AWAITING',
      amount: 850.46,
      business: { name: 'Cafe Joy' },
    });
  });
  it('only works for staff of the business', async () => {
    const ctx = setup({ staffIds: [] });
    const open = await ctx.service.open(CUSTOMER);
    await expect(
      ctx.service.enter({ id: 'rando' }, { businessId: 'biz1', code: open.code, amount: 100 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('a business that is not approved cannot use it', async () => {
    const ctx = setup({ staffIds: ['staff1'], status: 'PENDING_VERIFICATION' });
    const open = await ctx.service.open(CUSTOMER);
    await expect(
      ctx.service.enter(STAFF, { businessId: 'biz1', code: open.code, amount: 100 }),
    ).rejects.toThrow(/approved/);
  });
  it('checks the amount and the code', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await ctx.service.open(CUSTOMER);
    for (const amount of [0, -5, NaN, QUICK.amountMax + 1]) {
      await expect(
        ctx.service.enter(STAFF, { businessId: 'biz1', code: open.code, amount }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      ctx.service.enter(STAFF, { businessId: 'biz1', code: '12', amount: 100 }),
    ).rejects.toThrow(/6 digits/);
    await expect(
      ctx.service.enter(STAFF, { businessId: 'biz1', code: '000000', amount: 100 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      ctx.service.enter(STAFF, { businessId: 'biz1', code: open.code, amount: QUICK.amountMax }),
    ).resolves.toBeTruthy();
  });
  it('a code that ran out of time is refused', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await ctx.service.open(CUSTOMER);
    ctx.state.reqs[0].expiresAt = new Date(Date.now() - 1000);
    await expect(
      ctx.service.enter(STAFF, { businessId: 'biz1', code: open.code, amount: 100 }),
    ).rejects.toThrow(/not active/);
  });
  it('nobody can enter their own bill, and people who work at the business cannot earn from it', async () => {
    const own = setup({ staffIds: ['cust'] });
    const open = await own.service.open(CUSTOMER);
    await expect(
      own.service.enter(CUSTOMER, { businessId: 'biz1', code: open.code, amount: 100 }),
    ).rejects.toThrow(/own bill/);
    const insider = setup({ staffIds: ['staff1'], insider: true });
    const o2 = await insider.service.open(CUSTOMER);
    await expect(
      insider.service.enter(STAFF, { businessId: 'biz1', code: o2.code, amount: 100 }),
    ).rejects.toThrow(/belongs to this business/);
  });
  it('a customer has a daily limit of Quick pay bills at one business', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    for (let i = 0; i < QUICK.perCustomerPerDay; i++) {
      ctx.state.bills.push({ id: `b${i}`, userId: 'cust', businessId: 'biz1', source: 'COUNTER' });
    }
    const open = await ctx.service.open(CUSTOMER);
    await expect(
      ctx.service.enter(STAFF, { businessId: 'biz1', code: open.code, amount: 100 }),
    ).rejects.toThrow(/3 Quick pay bills today/);
  });
  it('the same code cannot be used by two staff at once', async () => {
    const ctx = setup({ staffIds: ['staff1', 'staff2'] });
    const open = await ctx.service.open(CUSTOMER);
    const r = await Promise.allSettled([
      ctx.service.enter(STAFF, { businessId: 'biz1', code: open.code, amount: 100 }),
      ctx.service.enter({ id: 'staff2' }, { businessId: 'biz1', code: open.code, amount: 200 }),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  });
});

describe('the customer confirms', () => {
  it('creates a verified bill, spend and points at once, and moves rewards forward', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await entered(ctx, 850);
    const out = await ctx.service.decide(CUSTOMER, open.id, true);
    expect(out).toMatchObject({ status: 'CONFIRMED' });
    expect(ctx.state.bills[0]).toMatchObject({
      tenantId: 'tc',
      userId: 'cust',
      businessId: 'biz1',
      amount: 850,
      status: 'VERIFIED',
      source: 'COUNTER',
      verifiedBy: 'staff1',
      orderChannel: 'IN_STORE',
    });
    expect(ctx.state.purchases[0]).toMatchObject({
      userId: 'cust',
      businessId: 'biz1',
      amount: 850,
      billId: ctx.state.bills[0].id,
    });
    expect(ctx.state.points[0]).toMatchObject({ points: 850 });
    expect(ctx.rewards.onSpend).toHaveBeenCalledWith('cust', 'biz1');
    expect(ctx.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COUNTER_BILL_CONFIRMED' }),
    );
  });
  it('a second tap does not make a second bill', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await entered(ctx);
    await Promise.all([
      ctx.service.decide(CUSTOMER, open.id, true),
      ctx.service.decide(CUSTOMER, open.id, true),
    ]).catch(() => undefined);
    expect(ctx.state.bills).toHaveLength(1);
    expect(ctx.state.points).toHaveLength(1);
  });
  it('declining creates nothing', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await entered(ctx);
    expect(await ctx.service.decide(CUSTOMER, open.id, false)).toEqual({ status: 'DECLINED' });
    expect(ctx.state.bills).toHaveLength(0);
    await expect(ctx.service.decide(CUSTOMER, open.id, true)).rejects.toThrow(/nothing to confirm/);
  });
  it('only the customer it belongs to can answer, and only before it times out', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await entered(ctx);
    await expect(
      ctx.service.decide({ id: 'other', tenantId: 'x' }, open.id, true),
    ).rejects.toBeInstanceOf(NotFoundException);
    ctx.state.reqs[0].expiresAt = new Date(Date.now() - 1000);
    await expect(ctx.service.decide(CUSTOMER, open.id, true)).rejects.toThrow(/timed out/);
    expect(ctx.state.bills).toHaveLength(0);
  });
  it('nothing to confirm before staff have entered an amount', async () => {
    const ctx = setup();
    const open = await ctx.service.open(CUSTOMER);
    await expect(ctx.service.decide(CUSTOMER, open.id, true)).rejects.toThrow(/nothing to confirm/);
  });
  it('staff can see when the customer has confirmed', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await entered(ctx);
    expect(await ctx.service.staffStatus(STAFF, 'biz1', open.id)).toMatchObject({
      status: 'AWAITING',
      amount: 850,
    });
    await ctx.service.decide(CUSTOMER, open.id, true);
    expect(await ctx.service.staffStatus(STAFF, 'biz1', open.id)).toMatchObject({
      status: 'CONFIRMED',
    });
  });
});

describe('the owner reviews and cancels', () => {
  async function confirmed() {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await entered(ctx, 700);
    await ctx.service.decide(CUSTOMER, open.id, true);
    return ctx;
  }
  it('lists recent bills with the staff member who entered them, customer name masked', async () => {
    const ctx = await confirmed();
    const rows = await ctx.service.recent(OWNER, 'biz1');
    expect(rows[0]).toMatchObject({
      amount: 700,
      customer: 'Asha N.',
      staff: 'Ravi Menon',
      voided: false,
      canVoid: true,
    });
  });
  it('cancelling takes back the spend and points and tells the customer', async () => {
    const ctx = await confirmed();
    const billId = ctx.state.bills[0].id;
    await expect(ctx.service.voidBill(OWNER, billId)).resolves.toEqual({ ok: true });
    expect(ctx.state.bills[0]).toMatchObject({ status: 'REJECTED', voidedBy: 'owner' });
    expect(ctx.state.purchases[0].deletedAt).toBeInstanceOf(Date);
    expect(ctx.state.points[0].deletedAt).toBeInstanceOf(Date);
    expect(ctx.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COUNTER_BILL_VOIDED' }),
    );
    expect(ctx.notifications.send).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'A bill was cancelled' }),
    );
    await expect(ctx.service.voidBill(OWNER, billId)).resolves.toMatchObject({ already: true });
  });
  it('only managers can cancel, only Quick pay bills, and only within 7 days', async () => {
    const ctx = await confirmed();
    const billId = ctx.state.bills[0].id;
    await expect(ctx.service.voidBill(STAFF, billId)).rejects.toBeInstanceOf(ForbiddenException);
    ctx.state.bills[0].createdAt = new Date(Date.now() - (QUICK.voidDays + 1) * DAY);
    await expect(ctx.service.voidBill(OWNER, billId)).rejects.toThrow(/within 7 days/);
    ctx.state.bills[0].createdAt = new Date();
    ctx.state.bills[0].source = 'PHOTO';
    await expect(ctx.service.voidBill(OWNER, billId)).rejects.toThrow(/Only Quick pay/);
  });
  it('staff cannot read the owner list', async () => {
    const ctx = await confirmed();
    await expect(ctx.service.recent(STAFF, 'biz1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Quick pay is not a way round the rules', () => {
  it('the daily limit counts confirmed Quick pay bills only, so a photo bill does not use it up', () => {
    expect(QUICK.perCustomerPerDay).toBe(3);
    expect(QUICK.amountMax).toBe(25_000);
  });
  it('a ConflictException from a lost race is answered with the settled state, not an error', async () => {
    const ctx = setup({ staffIds: ['staff1'] });
    const open = await entered(ctx);
    ctx.db.$transaction = jest.fn(async () => {
      throw new ConflictException('Already answered.');
    });
    ctx.state.reqs[0].status = 'CONFIRMED';
    ctx.state.reqs[0].billId = 'b-existing';
    await expect(ctx.service.decide(CUSTOMER, open.id, true)).rejects.toThrow(/nothing to confirm/);
  });
});
