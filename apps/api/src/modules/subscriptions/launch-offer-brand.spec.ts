import { ConflictException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

// The launch offer gives one slot per BRAND: once one outlet holds it, sibling outlets register on a
// regular plan. The check runs inside the same transaction that reserves the slot.
function makeService(siblingHolds: number) {
  const tx: any = {
    $queryRaw: jest.fn(async () => [{ ok: 1 }]),
    business: {
      findUnique: jest.fn(async () => ({ status: 'DRAFT', launchOfferClaimedAt: null })),
      count: jest.fn(async ({ where }: any) => (where.brandId ? siblingHolds : 0)),
      update: jest.fn(),
    },
  };
  const db: any = {
    business: {
      findFirst: jest.fn(),
    },
    subscription: { findFirst: jest.fn(async () => ({ id: 'sub-1' })) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const audit: any = { log: jest.fn() };
  return { service: new SubscriptionsService(db, audit), db, tx };
}

const baseBusiness = {
  id: 'biz-2',
  ownerId: 'owner-1',
  categoryId: 'cat-1',
  status: 'DRAFT',
  category: { name: 'Restaurants' },
};

describe('claimLaunchOffer — one slot per brand', () => {
  it('rejects an outlet when a sibling outlet already holds the brand slot', async () => {
    const { service, db, tx } = makeService(1);
    db.business.findFirst.mockResolvedValue({ ...baseBusiness, brandId: 'brand-1' });

    await expect(service.claimLaunchOffer('owner-1', 'ten-1', 'biz-2')).rejects.toBeInstanceOf(ConflictException);
    // took the per-brand lock, and never reserved a slot
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.business.update).not.toHaveBeenCalled();
  });

  it('counts only siblings (not itself) of the same brand', async () => {
    const { service, db, tx } = makeService(1);
    db.business.findFirst.mockResolvedValue({ ...baseBusiness, brandId: 'brand-1' });
    await service.claimLaunchOffer('owner-1', 'ten-1', 'biz-2').catch(() => {});
    const where = tx.business.count.mock.calls[0][0].where;
    expect(where).toMatchObject({ brandId: 'brand-1', id: { not: 'biz-2' } });
  });

  it('lets the first outlet of a brand claim, and a single business is unaffected', async () => {
    for (const brandId of ['brand-1', null]) {
      const { service, db, tx } = makeService(0);
      db.business.findFirst.mockResolvedValue({ ...baseBusiness, brandId });
      await service.claimLaunchOffer('owner-1', 'ten-1', 'biz-2');
      expect(tx.business.update).toHaveBeenCalledWith({ where: { id: 'biz-2' }, data: { launchOfferClaimedAt: expect.any(Date) } });
      // single business: only the per-category lock, no brand lock
      expect(tx.$queryRaw).toHaveBeenCalledTimes(brandId ? 2 : 1);
    }
  });
});
