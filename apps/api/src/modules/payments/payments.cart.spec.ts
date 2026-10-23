import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

// These specs cover the paid plans, which are dormant unless the flag is on.
process.env.PAYMENTS_ENABLED = 'true';

const DAY = 86_400_000;

function make(opts: { business?: any; live?: any[]; payment?: any } = {}) {
  const business = opts.business ?? {
    id: 'biz-1',
    tenantId: 'ten-1',
    ownerId: 'user-1',
    email: 'o@x.in',
    brandId: null,
  };
  const created: any[] = [];
  const tx: any = {
    subscription: {
      updateMany: jest.fn(async () => ({})),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `sub-${created.length + 1}`, ...data };
        created.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        if (where.id?.in) return created.filter((c) => where.id.in.includes(c.id));
        return opts.live ?? [];
      }),
      update: jest.fn(async () => ({})),
    },
    payment: { create: jest.fn(async ({ data }: any) => ({ id: 'pay-1', ...data })) },
  };
  const db: any = {
    business: { findFirst: jest.fn(async () => business) },
    payment: {
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async () => opts.payment ?? null),
      update: jest.fn(async ({ data }: any) => ({ ...(opts.payment ?? {}), ...data })),
    },
    subscription: { update: jest.fn() },
    transaction: { create: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const audit: any = { log: jest.fn() };
  const storage: any = { verifyStoredFile: jest.fn() };
  const entitlements: any = { invalidate: jest.fn() };
  const service = new PaymentsService(db, audit, storage, {} as any, entitlements);
  return { service, db, tx, created, entitlements };
}

const dto = (lines: any[], cycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY') =>
  ({ cycle, lines, method: 'UPI_QR' }) as any;

describe('PaymentsService.purchaseCart', () => {
  it('prices the cart on the server, with GST, and queues one row per line', async () => {
    const { service, tx } = make();
    const r = await service.purchaseCart(
      'user-1',
      'biz-1',
      dto([
        { code: 'SINGLE', quantity: 1 },
        { code: 'ADDON_OV', quantity: 2 },
      ]),
    );
    // 349 + 2*149 = 647, GST-inclusive; GST inside = 647 - round(647/1.18) = 99
    expect(r.payment.amount).toBe(647);
    expect(r.payment.invoiceMetadata).toMatchObject({
      amountBase: 548,
      amountTax: 99,
      billingCycle: 'MONTHLY',
    });
    expect(tx.subscription.create).toHaveBeenCalledTimes(2);
    expect(tx.subscription.create.mock.calls[0][0].data).toMatchObject({
      packageName: 'SINGLE',
      kind: 'BASE',
      status: 'PENDING_PAYMENT',
      quantity: 1,
      duration: 30,
    });
    expect(tx.subscription.create.mock.calls[1][0].data).toMatchObject({
      packageName: 'ADDON_OV',
      kind: 'ADDON',
      quantity: 2,
      billingCycle: 'MONTHLY',
    });
  });

  it('yearly uses the yearly price and 365 days', async () => {
    const { service, tx } = make();
    const r = await service.purchaseCart(
      'user-1',
      'biz-1',
      dto([{ code: 'SINGLE_AN', quantity: 1 }], 'YEARLY'),
    );
    expect(r.payment.amount).toBe(3999); // GST-inclusive
    expect(tx.subscription.create.mock.calls[0][0].data.duration).toBe(365);
  });

  it('only the owner may buy', async () => {
    const { service } = make();
    await expect(
      service.purchaseCart('someone', 'biz-1', dto([{ code: 'SINGLE', quantity: 1 }])),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('brand outlets must use MULTI, standalone must use SINGLE', async () => {
    const outlet = make({
      business: { id: 'b', tenantId: 't', ownerId: 'user-1', email: 'e', brandId: 'brand-1' },
    });
    await expect(
      outlet.service.purchaseCart('user-1', 'b', dto([{ code: 'SINGLE', quantity: 1 }])),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      outlet.service.purchaseCart('user-1', 'b', dto([{ code: 'MULTI', quantity: 1 }])),
    ).resolves.toBeDefined();

    const solo = make();
    await expect(
      solo.service.purchaseCart('user-1', 'biz-1', dto([{ code: 'MULTI', quantity: 1 }])),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid cart (no yearly add-on offer, unknown code)', async () => {
    const { service } = make();
    await expect(
      service.purchaseCart(
        'user-1',
        'biz-1',
        dto([{ code: 'ADDON_OFFER', quantity: 1 }], 'YEARLY'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.purchaseCart('user-1', 'biz-1', dto([{ code: 'PLATINUM', quantity: 1 }])),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PaymentsService.verifyPayment for a cart', () => {
  const cartPayment = (ids: string[]) => ({
    id: 'pay-1',
    tenantId: 'ten-1',
    businessId: 'biz-1',
    status: 'PENDING',
    amount: 764,
    method: 'UPI_QR',
    transactionRef: null,
    subscriptionId: ids[0],
    invoiceMetadata: { subscriptionIds: ids, cycle: 'NEW', amountBase: 647, amountTax: 117 },
  });

  function withPending(live: any[], rows: { packageName: string; cycle?: string }[]) {
    const m = make({ live, payment: cartPayment(rows.map((_, i) => `sub-${i + 1}`)) });
    rows.forEach((r, i) =>
      m.created.push({
        id: `sub-${i + 1}`,
        businessId: 'biz-1',
        packageName: r.packageName,
        billingCycle: r.cycle ?? 'MONTHLY',
        kind: r.packageName.startsWith('ADDON_') ? 'ADDON' : 'BASE',
        quantity: 1,
      }),
    );
    return m;
  }

  it('activates the rows, starting now, and busts the entitlement cache', async () => {
    const { service, tx, entitlements } = withPending([], [{ packageName: 'SINGLE' }]);
    await service.verifyPayment('admin', 'ten', 'pay-1');
    const upd = tx.subscription.update.mock.calls[0][0];
    expect(upd.data.status).toBe('ACTIVE');
    const days = (upd.data.endDate.getTime() - upd.data.startDate.getTime()) / DAY;
    expect(Math.round(days)).toBe(30);
    expect(entitlements.invalidate).toHaveBeenCalledWith('biz-1');
  });

  it('a different bundle replaces the live one (legacy included) with no carry-over', async () => {
    const live = [
      {
        id: 'old',
        packageName: 'WHTZUP_PLUS',
        kind: 'BASE',
        billingCycle: 'QUARTERLY',
        endDate: new Date(Date.now() + 60 * DAY),
      },
    ];
    const { service, tx } = withPending(live, [{ packageName: 'SINGLE' }]);
    await service.verifyPayment('admin', 'ten', 'pay-1');
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['old'] } },
      data: { status: 'EXPIRED' },
    });
    const days =
      (tx.subscription.update.mock.calls[0][0].data.endDate.getTime() - Date.now()) / DAY;
    expect(Math.round(days)).toBe(30);
  });

  it('renewing the same bundle on the same cycle carries the remaining time over', async () => {
    const live = [
      {
        id: 'cur',
        packageName: 'SINGLE',
        kind: 'BASE',
        billingCycle: 'MONTHLY',
        endDate: new Date(Date.now() + 10 * DAY),
      },
    ];
    const { service, tx } = withPending(live, [{ packageName: 'SINGLE' }]);
    await service.verifyPayment('admin', 'ten', 'pay-1');
    const days =
      (tx.subscription.update.mock.calls[0][0].data.endDate.getTime() - Date.now()) / DAY;
    expect(Math.round(days)).toBe(40);
  });

  it('an add-on does not touch the bundle, only live rows of the same add-on', async () => {
    const live = [
      {
        id: 'bundle',
        packageName: 'SINGLE',
        kind: 'BASE',
        billingCycle: 'MONTHLY',
        endDate: new Date(Date.now() + 20 * DAY),
      },
      {
        id: 'oldAddon',
        packageName: 'ADDON_OV',
        kind: 'ADDON',
        billingCycle: 'MONTHLY',
        endDate: new Date(Date.now() + 5 * DAY),
      },
    ];
    const { service, tx } = withPending(live, [{ packageName: 'ADDON_OV' }]);
    await service.verifyPayment('admin', 'ten', 'pay-1');
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['oldAddon'] } },
      data: { status: 'EXPIRED' },
    });
  });

  it('verifying twice does not extend twice', async () => {
    const m = make({ payment: { ...cartPayment(['sub-1']), status: 'SUCCESS' } });
    await m.service.verifyPayment('admin', 'ten', 'pay-1');
    expect(m.db.payment.update).not.toHaveBeenCalled();
  });
});
