import { PlanEnforcementService } from './plan-enforcement.service';

const future = () => new Date(Date.now() + 10 * 86_400_000);

function make(ent: any, offers: string[], vouchers: string[]) {
  const db: any = {
    offer: {
      findMany: jest.fn(async () => offers.map((id) => ({ id }))),
      updateMany: jest.fn(),
    },
    voucher: {
      findMany: jest.fn(async () => vouchers.map((id) => ({ id }))),
      updateMany: jest.fn(),
    },
    business: { findUnique: jest.fn(async () => ({ ownerId: 'u', tenantId: 't', name: 'Cafe' })) },
  };
  const entitlements: any = { forBusiness: jest.fn(async () => ent) };
  const notifications: any = { send: jest.fn() };
  const audit: any = { log: jest.fn() };
  const svc = new PlanEnforcementService(db, {} as any, entitlements, notifications, audit);
  return { svc, db, notifications };
}

describe('PlanEnforcementService.pauseOverLimit', () => {
  it('pauses the newest extras first and tells the owner once', async () => {
    // newest first: o3, o2, o1 -> limit 1 keeps the oldest (o1)
    const { svc, db, notifications } = make(
      { source: 'FREE', offers: 1, vouchers: 0, analytics: false },
      ['o3', 'o2', 'o1'],
      ['v1'],
    );
    const r = await svc.pauseOverLimit('biz');
    expect(r).toEqual({ offers: 2, vouchers: 1 });
    expect(db.offer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['o3', 'o2'] } },
      data: { status: 'PAUSED' },
    });
    expect(db.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['v1'] } },
      data: { status: 'PAUSED' },
    });
    expect(notifications.send).toHaveBeenCalledTimes(1);
  });

  it('does nothing when within the limit', async () => {
    const { svc, db, notifications } = make(
      { source: 'PLAN', offers: 3, vouchers: 3, analytics: false },
      ['a', 'b'],
      ['x'],
    );
    expect(await svc.pauseOverLimit('biz')).toEqual({ offers: 0, vouchers: 0 });
    expect(db.offer.updateMany).not.toHaveBeenCalled();
    expect(notifications.send).not.toHaveBeenCalled();
  });

  it('never touches grandfathered legacy plans', async () => {
    const { svc, db } = make(
      { source: 'LEGACY', offers: 1, vouchers: 1, analytics: true },
      ['a', 'b', 'c'],
      ['x', 'y'],
    );
    expect(await svc.pauseOverLimit('biz')).toEqual({ offers: 0, vouchers: 0 });
    expect(db.offer.findMany).not.toHaveBeenCalled();
  });
});
