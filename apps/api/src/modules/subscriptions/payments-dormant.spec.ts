import { NotFoundException } from '@nestjs/common';
import { INCLUDED_PLAN_CODE, INCLUDED_PLAN_ENTITLEMENTS } from '@saas/types';
import { EntitlementsService } from './entitlements.service';
import { PaymentsEnabledGuard } from '../../common/guards/payments-enabled.guard';

describe('payments dormant', () => {
  const original = process.env.PAYMENTS_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.PAYMENTS_ENABLED;
    else process.env.PAYMENTS_ENABLED = original;
  });

  it('guard 404s when the flag is off and opens when it is on', () => {
    const guard = new PaymentsEnabledGuard();
    delete process.env.PAYMENTS_ENABLED;
    expect(() => guard.canActivate()).toThrow(NotFoundException);
    process.env.PAYMENTS_ENABLED = 'true';
    expect(guard.canActivate()).toBe(true);
  });

  it('every business gets the single included plan, ignoring subscription rows', async () => {
    delete process.env.PAYMENTS_ENABLED;
    const db: any = { subscription: { findMany: jest.fn(async () => [{ packageName: 'WHTZUP' }]) } };
    const redis: any = { get: jest.fn(async () => null), set: jest.fn(), del: jest.fn() };
    const svc = new EntitlementsService(db, redis);
    const e = await svc.forBusiness('b1');
    expect(e).toMatchObject({ plan: INCLUDED_PLAN_CODE, ...INCLUDED_PLAN_ENTITLEMENTS, addons: [] });
    expect(e.offers).toBe(3);
    expect(e.vouchers).toBe(3);
    expect(e.analytics).toBe(true);
    expect(db.subscription.findMany).not.toHaveBeenCalled();
  });

  it('hitting the limit says to pause or end one, with no upgrade link', async () => {
    delete process.env.PAYMENTS_ENABLED;
    const db: any = {
      offer: { count: jest.fn(async () => 3) },
      voucher: { count: jest.fn(async () => 0) },
      subscription: { findMany: jest.fn() },
    };
    const redis: any = { get: jest.fn(async () => null), set: jest.fn(), del: jest.fn() };
    const svc = new EntitlementsService(db, redis);
    await expect(svc.assertCanGoLive('b1', 'offer')).rejects.toMatchObject({
      response: {
        code: 'PLAN_LIMIT',
        message: expect.stringContaining('Pause or end one'),
        details: expect.not.objectContaining({ upgradeUrl: expect.anything() }),
      },
    });
  });
});
