import { ForbiddenException } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

const future = () => new Date(Date.now() + 10 * 86_400_000);

function make(opts: { atLimit?: boolean; existing?: any } = {}) {
  const entitlements: any = {
    assertCanGoLive: jest.fn(async () => {
      if (opts.atLimit)
        throw new ForbiddenException({ statusCode: 403, message: 'limit', code: 'PLAN_LIMIT' });
    }),
  };
  const db: any = {
    business: {
      findFirst: jest.fn(async () => ({ id: 'biz-1', tenantId: 't', ownerId: 'u', name: 'B' })),
    },
    voucher: {
      create: jest.fn(async ({ data }: any) => ({ id: 'v-new', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'v1', ...data })),
      findFirst: jest.fn(async () => opts.existing ?? null),
    },
  };
  return { service: new VouchersService(db, entitlements), db, entitlements };
}

describe('VouchersService plan limits', () => {
  const dto = { title: 'V', thresholdAmount: 500, endDate: future().toISOString() };

  it('creating a live voucher is checked', async () => {
    const { service, entitlements, db } = make();
    await service.create('u', 'biz-1', dto);
    expect(entitlements.assertCanGoLive).toHaveBeenCalledWith('biz-1', 'voucher');
    expect(db.voucher.create).toHaveBeenCalled();
  });

  it('Free (limit 0) cannot create a live voucher', async () => {
    const { service, db } = make({ atLimit: true });
    await expect(service.create('u', 'biz-1', dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.voucher.create).not.toHaveBeenCalled();
  });

  it('a PAUSED voucher can be saved without a check', async () => {
    const { service, entitlements } = make({ atLimit: true });
    await service.create('u', 'biz-1', { ...dto, status: 'PAUSED' });
    expect(entitlements.assertCanGoLive).not.toHaveBeenCalled();
  });

  it('re-activating is checked, and blocked at the limit', async () => {
    const existing = { id: 'v1', businessId: 'biz-1', status: 'PAUSED', endDate: future() };
    const { service, db } = make({ atLimit: true, existing });
    await expect(service.update('u', 'v1', { status: 'ACTIVE' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db.voucher.update).not.toHaveBeenCalled();
  });
});
