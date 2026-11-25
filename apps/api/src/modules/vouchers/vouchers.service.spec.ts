import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { RewardProgressService } from '../rewards/reward-progress.service';
import { RewardAudienceService } from '../rewards/reward-audience.service';

const DAY = 86_400_000;
const OWNER = { id: 'owner' };
const STAFF = { id: 'staff1' };
const STRANGER = { id: 'nobody' };
const CAFE_CAT = '11111111-1111-4111-8111-111111111111';

/** A small in-memory database: just enough of Prisma for the reward rules to run for real. */
function setup(
  opts: { voucher?: any; purchases?: any[]; staffIds?: string[]; managerIds?: string[] } = {},
) {
  const biz = {
    id: 'biz1',
    entityId: null,
    tenantId: 't1',
    ownerId: 'owner',
    name: 'Cafe Joy',
    city: 'Kochi',
  };
  const state: any = {
    vouchers: [
      {
        id: 'v1',
        tenantId: 't1',
        businessId: 'biz1',
        title: 'Free dessert',
        description: null,
        thresholdAmount: 1000,
        rewardType: 'FREEBIE',
        rewardValue: null,
        rewardLabel: 'Free dessert',
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 10 * DAY),
        endDate: new Date(Date.now() + 20 * DAY),
        maxRedemptions: null,
        currentRedemptions: 0,
        currentClaims: 0,
        terms: null,
        spendWindow: 'SINCE_START',
        repeatable: false,
        perCustomerLimit: null,
        audience: {},
        claimValidDays: 30,
        deletedAt: null,
        ...opts.voucher,
      },
    ],
    claims: [] as any[],
    events: [] as any[],
    purchases: opts.purchases ?? [],
  };
  const pass = (p: any) => !p.deletedAt;
  const db: any = {
    business: {
      findFirst: jest.fn(async (args: any) => {
        const w = args?.select?.staff?.where;
        const uid = w?.userId;
        // A "managers only" lookup (owner, moderator) filters staff by role; plain staff do not pass it.
        const ok =
          uid &&
          (opts.staffIds ?? []).includes(uid) &&
          (!w?.role || (opts.managerIds ?? []).includes(uid));
        return { ...biz, brand: null, staff: ok ? [{ id: 's' }] : [] };
      }),
    },
    voucher: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          state.vouchers.find((v: any) => v.id === where.id && !v.deletedAt) ?? null,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        state.vouchers.filter(
          (v: any) =>
            (!where.businessId ||
              v.businessId === where.businessId ||
              where.businessId.in?.includes(v.businessId)) &&
            !v.deletedAt &&
            (!where.status || v.status === where.status) &&
            (!where.endDate?.gte || v.endDate >= where.endDate.gte) &&
            (!where.startDate?.lte || v.startDate <= where.startDate.lte),
        ),
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const v = state.vouchers.find((x: any) => x.id === where.id);
        for (const [k, val] of Object.entries(data)) {
          v[k] =
            val && typeof val === 'object' && 'increment' in (val as any)
              ? v[k] + (val as any).increment
              : val;
        }
        return { ...v };
      }),
    },
    voucherClaim: {
      findFirst: jest.fn(async ({ where }: any) => {
        const list = state.claims.filter(
          (c: any) =>
            (!where.id || c.id === where.id) &&
            (!where.voucherId || c.voucherId === where.voucherId) &&
            (!where.userId || c.userId === where.userId) &&
            (!where.cycleKey || c.cycleKey === where.cycleKey) &&
            (!where.businessId || c.businessId === where.businessId) &&
            (!where.code || c.code === where.code) &&
            (!where.tenantId || c.tenantId === where.tenantId) &&
            pass(c),
        );
        const c = list[list.length - 1];
        if (!c) return null;
        return {
          ...c,
          voucher: state.vouchers.find((v: any) => v.id === c.voucherId),
          user: { id: c.userId, name: 'Asha Nair', tenantId: 'tu' },
        };
      }),
      findMany: jest.fn(async ({ where }: any) =>
        state.claims.filter(
          (c: any) =>
            (!where.userId || c.userId === where.userId) &&
            (!where.voucherId || c.voucherId === where.voucherId) &&
            pass(c),
        ),
      ),
      count: jest.fn(
        async ({ where }: any) =>
          state.claims.filter(
            (c: any) =>
              (!where.voucherId || c.voucherId === where.voucherId) &&
              (!where.userId || c.userId === where.userId) &&
              (!where.status || c.status === where.status) &&
              (!where.unlockedAt?.gte || c.unlockedAt >= where.unlockedAt.gte) &&
              pass(c),
          ).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        if (
          state.claims.some(
            (c: any) =>
              c.voucherId === data.voucherId &&
              c.userId === data.userId &&
              c.cycleKey === data.cycleKey,
          )
        ) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        const c = {
          id: `c${state.claims.length + 1}`,
          status: 'UNLOCKED',
          unlockedAt: new Date(),
          redeemedAt: null,
          deletedAt: null,
          ...data,
        };
        state.claims.push(c);
        return c;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = state.claims.filter((c: any) => c.id === where.id && c.status === where.status);
        hit.forEach((c: any) => Object.assign(c, data));
        return { count: hit.length };
      }),
    },
    verifiedPurchase: {
      aggregate: jest.fn(async ({ where }: any) => {
        const sum = state.purchases
          .filter(
            (p: any) =>
              p.userId === where.userId &&
              (!where.businessId || p.businessId === where.businessId) &&
              (!where.purchaseDate?.gte || p.purchaseDate >= where.purchaseDate.gte) &&
              (!where.business?.categoryId || where.business.categoryId.in.includes(p.categoryId)),
          )
          .reduce((a: number, p: any) => a + p.amount, 0);
        return { _sum: { amount: sum }, _max: { purchaseDate: null } };
      }),
      groupBy: jest.fn(async () => []),
    },
    category: { findMany: jest.fn(async () => []) },
    customer: { findFirst: jest.fn(async () => ({ city: 'Kochi' })) },
    rewardEvent: {
      create: jest.fn(async ({ data }: any) => {
        if (
          state.events.some((e: any) =>
            ['userId', 'voucherId', 'kind', 'cycleKey'].every((k) => e[k] === data[k]),
          )
        ) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        state.events.push(data);
        return data;
      }),
    },
    $transaction: jest.fn(async (fn: any) => {
      // Like a real transaction, a failure undoes only this transaction's own work.
      const bumped: any[] = [];
      const added: any[] = [];
      const raw = async (strings: TemplateStringsArray, ...values: any[]) => {
        void strings;
        const v = state.vouchers.find((x: any) => x.id === values[0]);
        if (v && (v.maxRedemptions == null || v.currentClaims < v.maxRedemptions)) {
          v.currentClaims += 1;
          bumped.push(v);
          return 1;
        }
        return 0;
      };
      const tx = {
        ...db,
        $executeRaw: raw,
        voucherClaim: {
          ...db.voucherClaim,
          create: async (args: any) => {
            const c = await db.voucherClaim.create(args);
            added.push(c);
            return c;
          },
        },
      };
      try {
        return await fn(tx);
      } catch (err) {
        bumped.forEach((v) => (v.currentClaims -= 1));
        added.forEach((c) => state.claims.splice(state.claims.indexOf(c), 1));
        throw err;
      }
    }),
  };
  const entitlements: any = { assertCanGoLive: jest.fn() };
  const audience = new RewardAudienceService(db);
  const progress = new RewardProgressService(db, audience);
  const audit: any = { log: jest.fn() };
  const notifications: any = { send: jest.fn(async () => ({})) };
  const service = new VouchersService(db, entitlements, progress, audience, audit, notifications);
  return { service, db, state, audit, notifications, entitlements };
}

const buy = (userId: string, amount: number, daysAgo: number, extra: any = {}) => ({
  userId,
  businessId: 'biz1',
  amount,
  purchaseDate: new Date(Date.now() - daysAgo * DAY),
  ...extra,
});

describe('claiming a reward', () => {
  it('is refused below the level, with how much is left', async () => {
    const { service } = setup({ purchases: [buy('u1', 400, 2)] });
    await expect(service.claim('u1', 'v1')).rejects.toThrow('Spend ₹600 more');
  });

  it('gives a code at the level, logs it, and counts it against the limit', async () => {
    const { service, state } = setup({ purchases: [buy('u1', 1000, 2)] });
    const out = await service.claim('u1', 'v1');
    expect(out.code).toMatch(/^VCH-[0-9A-F]{6}$/);
    expect(out.alreadyUnlocked).toBe(false);
    expect(state.claims[0]).toMatchObject({
      userId: 'u1',
      cycleKey: 'start:0',
      businessId: 'biz1',
    });
    expect(state.claims[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
    expect(state.vouchers[0].currentClaims).toBe(1);
    expect(state.events.map((e: any) => e.kind)).toEqual(['CLAIMED']);
  });

  it('only counts spend since the reward started', async () => {
    // ₹5,000 last year does not unlock a reward that began 10 days ago.
    const { service } = setup({ purchases: [buy('u1', 5000, 100), buy('u1', 300, 3)] });
    await expect(service.claim('u1', 'v1')).rejects.toThrow('Spend ₹700 more');
  });

  it('an old LIFETIME reward still counts everything', async () => {
    const { service } = setup({
      voucher: { spendWindow: 'LIFETIME' },
      purchases: [buy('u1', 5000, 100)],
    });
    await expect(service.claim('u1', 'v1')).resolves.toMatchObject({ alreadyUnlocked: false });
  });

  it('tapping twice returns the same code', async () => {
    const { service, state } = setup({ purchases: [buy('u1', 1000, 2)] });
    const a = await service.claim('u1', 'v1');
    const b = await service.claim('u1', 'v1');
    expect(b).toMatchObject({ code: a.code, alreadyUnlocked: true });
    expect(state.claims).toHaveLength(1);
    expect(state.vouchers[0].currentClaims).toBe(1);
  });

  it('two taps at the same moment still make one claim', async () => {
    const { service, state } = setup({ purchases: [buy('u1', 1000, 2)] });
    const [a, b] = await Promise.all([service.claim('u1', 'v1'), service.claim('u1', 'v1')]);
    expect(a.code).toBe(b.code);
    expect(state.claims).toHaveLength(1);
    expect(state.vouchers[0].currentClaims).toBe(1); // the loser's count was rolled back
  });

  it('the limit is on codes handed out, so unused codes still use up a slot', async () => {
    const { service } = setup({
      voucher: { maxRedemptions: 1 },
      purchases: [buy('u1', 1000, 2), buy('u2', 1000, 2)],
    });
    await service.claim('u1', 'v1');
    await expect(service.claim('u2', 'v1')).rejects.toThrow('fully claimed');
  });

  it('a repeatable reward can be claimed once per full level, then asks for the rest', async () => {
    const { service, state } = setup({
      voucher: { repeatable: true, perCustomerLimit: 5 },
      purchases: [buy('u1', 2300, 2)],
    });
    const a = await service.claim('u1', 'v1');
    const b = await service.claim('u1', 'v1');
    expect(a.code).not.toBe(b.code);
    expect(state.claims.map((c: any) => c.cycleKey)).toEqual(['start:0', 'start:1']);
    await expect(service.claim('u1', 'v1')).rejects.toThrow('Spend ₹700 more');
  });

  it('a repeatable reward stops at the per-customer limit', async () => {
    const { service } = setup({
      voucher: { repeatable: true, perCustomerLimit: 2 },
      purchases: [buy('u1', 9000, 2)],
    });
    await service.claim('u1', 'v1');
    await service.claim('u1', 'v1');
    await expect(service.claim('u1', 'v1')).rejects.toThrow('most times it allows');
  });

  it('refuses a paused, ended or not-yet-started reward', async () => {
    for (const over of [
      { status: 'PAUSED' },
      { endDate: new Date(Date.now() - DAY) },
      { startDate: new Date(Date.now() + DAY) },
    ]) {
      const { service } = setup({ voucher: over, purchases: [buy('u1', 1000, 0)] });
      await expect(service.claim('u1', 'v1')).rejects.toThrow('no longer available');
    }
  });

  it('a reward aimed at an audience cannot be claimed by someone outside it', async () => {
    const aud = { categoryIds: [CAFE_CAT], minSpend: 500, windowDays: 60 };
    const outside = setup({ voucher: { audience: aud }, purchases: [buy('u1', 1000, 2)] });
    await expect(outside.service.claim('u1', 'v1')).rejects.toBeInstanceOf(ForbiddenException);
    const inside = setup({
      voucher: { audience: aud },
      purchases: [buy('u1', 1000, 2, { categoryId: CAFE_CAT })],
    });
    await expect(inside.service.claim('u1', 'v1')).resolves.toMatchObject({
      alreadyUnlocked: false,
    });
  });
});

describe('what the customer sees on the business page', () => {
  it('progress, what is left, and nothing about the code until it is claimed', async () => {
    const { service } = setup({ purchases: [buy('u1', 250, 2)] });
    const out = await service.available('biz1', 'u1');
    expect(out.vouchers[0]).toMatchObject({
      progress: 0.25,
      remainingToUnlock: 750,
      qualified: false,
      unlocked: false,
      code: null,
      spendInWindow: 250,
    });
  });

  it('a signed-out visitor sees the rewards but no progress and no targeted ones', async () => {
    const targeted = {
      id: 'v1',
      audience: { categoryIds: [CAFE_CAT], minSpend: 100 },
    };
    const { service } = setup({ voucher: targeted });
    const out = await service.available('biz1', undefined);
    expect(out.vouchers).toEqual([]);
    const open = setup();
    const out2 = await open.service.available('biz1', undefined);
    expect(out2.vouchers[0]).toMatchObject({ progress: 0, code: null, qualified: false });
  });

  it('hides a targeted reward from people outside the audience, shows it to people inside', async () => {
    const aud = { categoryIds: [CAFE_CAT], minSpend: 500, windowDays: 60 };
    const { service } = setup({
      voucher: { audience: aud },
      purchases: [buy('in', 800, 5, { categoryId: CAFE_CAT }), buy('out', 800, 5)],
    });
    expect((await service.available('biz1', 'in')).vouchers).toHaveLength(1);
    expect((await service.available('biz1', 'out')).vouchers).toHaveLength(0);
  });
});

describe('redeeming at the counter', () => {
  async function claimed(over: any = {}) {
    const ctx = setup({ purchases: [buy('u1', 1000, 2)], staffIds: ['staff1'], ...over });
    const { code } = await ctx.service.claim('u1', 'v1');
    return { ...ctx, code };
  }

  it('any active staff member can redeem, and it is logged and the customer is told', async () => {
    const { service, code, audit, notifications, state } = await claimed();
    const out = await service.redeem(STAFF, 'biz1', code.toLowerCase(), { billAmount: 850 });
    expect(out).toMatchObject({ success: true, customer: 'Asha N.', voucherTitle: 'Free dessert' });
    expect(state.claims[0]).toMatchObject({
      status: 'REDEEMED',
      redeemedBy: 'staff1',
      redeemAmount: 850,
    });
    expect(state.vouchers[0].currentRedemptions).toBe(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VOUCHER_REDEEMED', userId: 'staff1' }),
    );
    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', title: 'Reward used' }),
    );
    expect(state.events.map((e: any) => e.kind)).toContain('REDEEMED');
  });

  it('someone with no link to the business cannot', async () => {
    const { service, code } = await claimed();
    await expect(service.redeem(STRANGER, 'biz1', code)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a code cannot be used twice, even by two staff at the same moment', async () => {
    const { service, code, state } = await claimed();
    const results = await Promise.allSettled([
      service.redeem(OWNER, 'biz1', code),
      service.redeem(STAFF, 'biz1', code),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(state.vouchers[0].currentRedemptions).toBe(1);
    await expect(service.redeem(OWNER, 'biz1', code)).rejects.toThrow('already been redeemed');
  });

  it('an expired code is refused with the date', async () => {
    const { service, code, state } = await claimed();
    state.claims[0].expiresAt = new Date(Date.now() - DAY);
    await expect(service.redeem(OWNER, 'biz1', code)).rejects.toThrow(/expired on/);
    expect(state.claims[0].status).toBe('UNLOCKED');
  });

  it('a code stays good after the reward is paused or ends (the customer earned it)', async () => {
    const { service, code, state } = await claimed();
    state.vouchers[0].status = 'PAUSED';
    state.vouchers[0].endDate = new Date(Date.now() - 2 * DAY);
    await expect(service.redeem(OWNER, 'biz1', code)).resolves.toMatchObject({ success: true });
  });

  it('an unknown code, or one from another business, is not found', async () => {
    const { service } = await claimed();
    await expect(service.redeem(OWNER, 'biz1', 'VCH-NOPE00')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lookup shows a masked name and whether the code works, without using it', async () => {
    const { service, code, state } = await claimed();
    const a = await service.lookup(STAFF, 'biz1', code);
    expect(a).toMatchObject({
      valid: true,
      reason: null,
      customer: 'Asha N.',
      title: 'Free dessert',
    });
    expect(state.claims[0].status).toBe('UNLOCKED');
    await service.redeem(STAFF, 'biz1', code);
    expect(await service.lookup(STAFF, 'biz1', code)).toMatchObject({
      valid: false,
      reason: 'Already used',
    });
  });
});

describe('editing and deleting a reward', () => {
  it('once someone has claimed, the promise cannot change, but the end date can be extended', async () => {
    const { service, state } = setup({ purchases: [buy('u1', 1000, 2)] });
    await service.claim('u1', 'v1');
    await expect(service.update(OWNER, 'v1', { thresholdAmount: 5000 })).rejects.toThrow(
      /already claimed/,
    );
    await expect(service.update(OWNER, 'v1', { repeatable: true })).rejects.toThrow(
      /already claimed/,
    );
    await expect(service.update(OWNER, 'v1', { audience: { cities: ['Kochi'] } })).rejects.toThrow(
      /already claimed/,
    );
    // Sending the same values back is fine.
    await expect(
      service.update(OWNER, 'v1', { thresholdAmount: 1000, title: 'Free dessert!' }),
    ).resolves.toBeTruthy();
    const later = new Date(Date.now() + 40 * DAY).toISOString();
    await expect(service.update(OWNER, 'v1', { endDate: later })).resolves.toBeTruthy();
    expect(state.vouchers[0].endDate.toISOString()).toBe(later);
  });

  it('the limit cannot go below the codes already handed out', async () => {
    const { service } = setup({ purchases: [buy('u1', 1000, 2), buy('u2', 1000, 2)] });
    await service.claim('u1', 'v1');
    await service.claim('u2', 'v1');
    await expect(service.update(OWNER, 'v1', { maxRedemptions: 1 })).rejects.toThrow(
      /already been claimed/,
    );
    await expect(service.update(OWNER, 'v1', { maxRedemptions: 2 })).resolves.toBeTruthy();
  });

  it('bad edits are explained', async () => {
    const { service } = setup();
    await expect(service.update(OWNER, 'v1', { title: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.update(OWNER, 'v1', { rewardType: 'PERCENT', rewardValue: 500 }),
    ).rejects.toThrow(/1 and 100/);
  });

  it('a reward with unused codes cannot be deleted, a clean one can', async () => {
    const { service, state } = setup({ purchases: [buy('u1', 1000, 2)] });
    await service.claim('u1', 'v1');
    await expect(service.remove(OWNER, 'v1')).rejects.toThrow(/unused code/);
    state.claims[0].status = 'REDEEMED';
    await expect(service.remove(OWNER, 'v1')).resolves.toEqual({ success: true });
  });

  it('staff who are not managers cannot create or edit', async () => {
    const { service } = setup({ staffIds: ['staff1'], managerIds: [] });
    await expect(service.update(STAFF, 'v1', { title: 'Nope nope' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('creating a reward', () => {
  const ok = {
    title: 'Free dessert',
    thresholdAmount: 1000,
    rewardType: 'FREEBIE',
    rewardLabel: 'Free dessert',
    endDate: new Date(Date.now() + 30 * DAY).toISOString(),
  };
  it('checks the input, cleans the audience and sets safe defaults', async () => {
    const { service, db } = setup();
    db.voucher.create = jest.fn(async ({ data }: any) => ({ id: 'new', ...data }));
    const out: any = await service.create(OWNER, 'biz1', {
      ...ok,
      audience: { categoryIds: [CAFE_CAT, 'junk'], minSpend: 3000, evil: 1 },
      repeatable: true,
    });
    expect(out).toMatchObject({
      spendWindow: 'SINCE_START',
      repeatable: true,
      perCustomerLimit: 10,
      claimValidDays: 30,
      audience: { categoryIds: [CAFE_CAT], minSpend: 3000, windowDays: 60 },
    });
    expect(out.audience.evil).toBeUndefined();
    await expect(
      service.create(OWNER, 'biz1', { ...ok, thresholdAmount: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create(STRANGER, 'biz1', ok)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('the wallet', () => {
  it('lists what is ready, what is close, and codes with usable ones first', async () => {
    const { service, db, state } = setup({ purchases: [buy('u1', 1000, 2)] });
    // A second, harder reward the customer is partway to.
    state.vouchers.push({
      ...state.vouchers[0],
      id: 'v2',
      title: 'Free meal',
      thresholdAmount: 2000,
    });
    db.verifiedPurchase.groupBy = jest.fn(async () => [
      { businessId: 'biz1', _sum: { amount: 1000 } },
    ]);
    db.voucherClaim.findMany = jest.fn(async () => []);
    const w = await service.wallet('u1');
    expect(w.ready.map((r: any) => r.title)).toEqual(['Free dessert']);
    expect(w.near.map((r: any) => r.title)).toEqual(['Free meal']);
    expect(w.near[0]).toMatchObject({ remaining: 1000, progress: 0.5 });
    expect(w.codes).toEqual([]);
  });
});
