import { RewardAudienceService } from './reward-audience.service';
import { RewardProgressService } from './reward-progress.service';
import { RewardSweepService } from './reward-sweep.service';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOW = Date.now();

function voucher(over: any = {}) {
  return {
    id: 'v1',
    tenantId: 't1',
    businessId: 'biz1',
    title: 'Free dessert',
    thresholdAmount: 1000,
    spendWindow: 'SINCE_START',
    repeatable: false,
    perCustomerLimit: null,
    startDate: new Date(NOW - 10 * DAY),
    endDate: new Date(NOW + 20 * DAY),
    audience: {},
    status: 'ACTIVE',
    ...over,
  };
}

function setup(opts: { spend: number; vouchers?: any[]; claims?: number } = { spend: 0 }) {
  const events: any[] = [];
  const db: any = {
    voucher: { findMany: jest.fn(async () => opts.vouchers ?? [voucher()]) },
    user: { findFirst: jest.fn(async () => ({ tenantId: 'tu' })) },
    business: { findFirst: jest.fn(async () => ({ name: 'Cafe Joy' })) },
    verifiedPurchase: {
      aggregate: jest.fn(async () => ({
        _sum: { amount: opts.spend },
        _max: { purchaseDate: null },
      })),
    },
    voucherClaim: { count: jest.fn(async () => opts.claims ?? 0) },
    rewardEvent: {
      create: jest.fn(async ({ data }: any) => {
        if (
          events.some((e) =>
            ['userId', 'voucherId', 'kind', 'cycleKey'].every((k) => e[k] === data[k]),
          )
        ) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        events.push(data);
        return data;
      }),
    },
  };
  const notifications: any = { send: jest.fn(async () => ({})) };
  const audience = new RewardAudienceService(db);
  const progress = new RewardProgressService(db, audience, notifications);
  return { progress, db, events, notifications };
}

describe('notices after a verified bill', () => {
  it('says nothing when the customer is far from the reward', async () => {
    const { progress, notifications, events } = setup({ spend: 300 });
    await progress.onSpend('u1', 'biz1', NOW);
    expect(notifications.send).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('says "almost there" at 80%, with how much is left, and only once', async () => {
    const { progress, notifications, events } = setup({ spend: 850 });
    await progress.onSpend('u1', 'biz1', NOW);
    await progress.onSpend('u1', 'biz1', NOW);
    expect(notifications.send).toHaveBeenCalledTimes(1);
    const sent = notifications.send.mock.calls[0][0];
    expect(sent).toMatchObject({ userId: 'u1', tenantId: 'tu', title: 'Almost there' });
    expect(sent.body).toContain('₹150');
    expect(sent.body).toContain('Cafe Joy');
    expect(events.map((e) => e.kind)).toEqual(['NEAR']);
  });

  it('says "ready" when the level is reached, once, and not "almost there" as well', async () => {
    const { progress, notifications, events } = setup({ spend: 1000 });
    await progress.onSpend('u1', 'biz1', NOW);
    await progress.onSpend('u1', 'biz1', NOW);
    expect(notifications.send).toHaveBeenCalledTimes(1);
    expect(notifications.send.mock.calls[0][0].title).toContain('Reward ready');
    expect(events.map((e) => e.kind)).toEqual(['READY']);
  });

  it('a repeatable reward gives a fresh "ready" for each new claim', async () => {
    const { progress, notifications, events } = setup({
      spend: 2000,
      vouchers: [voucher({ repeatable: true, perCustomerLimit: 5 })],
      claims: 0,
    });
    await progress.onSpend('u1', 'biz1', NOW);
    expect(events[0].cycleKey).toBe('start:0');
    // After the customer claims one, the next level has its own key.
    (progress as any).db.voucherClaim.count = jest.fn(async () => 1);
    await progress.onSpend('u1', 'biz1', NOW);
    expect(events.map((e) => e.cycleKey)).toEqual(['start:0', 'start:1']);
    expect(notifications.send).toHaveBeenCalledTimes(2);
  });

  it('says nothing about a reward the customer has already claimed in full', async () => {
    const { progress, notifications } = setup({ spend: 1500, claims: 1 });
    await progress.onSpend('u1', 'biz1', NOW);
    expect(notifications.send).not.toHaveBeenCalled();
  });

  it('skips a reward whose audience the customer is not in', async () => {
    const aud = { categoryIds: ['11111111-1111-4111-8111-111111111111'], minSpend: 100 };
    const { progress, notifications } = setup({
      spend: 1000,
      vouchers: [voucher({ audience: aud })],
    });
    // The fake has no category spend, so the customer does not fit.
    await progress.onSpend('u1', 'biz1', NOW);
    expect(notifications.send).not.toHaveBeenCalled();
  });

  it('never throws, even if the database does', async () => {
    const { progress, db } = setup({ spend: 1000 });
    db.voucher.findMany = jest.fn(async () => {
      throw new Error('db down');
    });
    await expect(progress.onSpend('u1', 'biz1', NOW)).resolves.toBeUndefined();
  });

  it('a notice that cannot be sent does not stop the rest', async () => {
    const { progress, notifications } = setup({ spend: 1000 });
    notifications.send = jest.fn(async () => {
      throw new Error('push failed');
    });
    await expect(progress.onSpend('u1', 'biz1', NOW)).resolves.toBeUndefined();
  });
});

describe('the hourly sweep', () => {
  function sweepSetup() {
    const events: any[] = [];
    const sent: any[] = [];
    const notified: any[] = [];
    const db: any = {
      voucherClaim: {
        findMany: jest.fn(async () => [
          {
            id: 'claim1',
            tenantId: 't1',
            userId: 'u1',
            voucherId: 'v1',
            businessId: 'biz1',
            expiresAt: new Date(NOW + 2 * DAY),
            voucher: { title: 'Free dessert' },
            business: { name: 'Cafe Joy' },
            user: { tenantId: 'tu' },
          },
        ]),
      },
      rewardEvent: {
        create: jest.fn(async ({ data }: any) => {
          if (events.some((e) => e.kind === data.kind && e.cycleKey === data.cycleKey)) {
            throw Object.assign(new Error('unique'), { code: 'P2002' });
          }
          events.push(data);
          return data;
        }),
      },
      billVerification: {
        groupBy: jest.fn(async () => [{ businessId: 'biz1', _count: { _all: 3 } }]),
      },
      business: {
        findMany: jest.fn(async () => [
          { id: 'biz1', name: 'Cafe Joy', ownerId: 'owner', tenantId: 't1' },
        ]),
      },
      notification: { findFirst: jest.fn(async () => (notified.length ? { id: 'n' } : null)) },
    };
    const notifications: any = {
      send: jest.fn(async (n: any) => {
        sent.push(n);
        if (n.title === 'Bills are waiting for you') notified.push(n);
      }),
    };
    const audience = new RewardAudienceService(db);
    const progress = new RewardProgressService(db, audience, notifications);
    return { sweep: new RewardSweepService(db, progress, notifications), sent, db };
  }

  it('warns once about a code that expires within 3 days', async () => {
    const { sweep, sent } = sweepSetup();
    expect(await sweep.remindExpiring(NOW)).toBe(1);
    expect(await sweep.remindExpiring(NOW)).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ userId: 'u1', title: 'Your reward expires soon' });
    expect(sent[0].body).toContain('2 days');
  });

  it('nudges an owner with bills waiting more than a day, at most once a day', async () => {
    const { sweep, sent } = sweepSetup();
    expect(await sweep.remindOwners(NOW)).toBe(1);
    expect(await sweep.remindOwners(NOW)).toBe(0);
    expect(sent[0]).toMatchObject({ userId: 'owner', tenantId: 't1' });
    expect(sent[0].body).toContain('3 bills');
  });

  it('only sends the owner digest in the 9 am hour India time', async () => {
    const { sweep, sent } = sweepSetup();
    // 08:00 IST (02:30 UTC): no digest. The expiring warning still goes out.
    await sweep.sweep(Date.parse('2026-11-25T02:30:00Z'));
    expect(sent.map((s) => s.title)).not.toContain('Bills are waiting for you');
  });

  it('sends the digest in the 9 am hour', async () => {
    const { sweep, sent, db } = sweepSetup();
    db.voucherClaim.findMany = jest.fn(async () => []);
    await sweep.sweep(Date.parse('2026-11-25T03:45:00Z')); // 09:15 IST
    expect(sent.map((s) => s.title)).toContain('Bills are waiting for you');
  });
});

describe('time helpers used by the sweep stay in step', () => {
  it('an hour is an hour', () => expect(HOUR * 24).toBe(DAY));
});
