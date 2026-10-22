import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { assertBusinessAccess, assertResourceAccess } from './business-access';

function dbWith(business: any, offer: any = { businessId: 'b1' }) {
  return {
    business: { findFirst: jest.fn().mockResolvedValue(business) },
    offer: { findFirst: jest.fn().mockResolvedValue(offer) },
    product: { findFirst: jest.fn().mockResolvedValue(offer) },
    event: { findFirst: jest.fn().mockResolvedValue(offer) },
  } as any;
}

const biz = { id: 'b1', ownerId: 'owner', brand: null, staff: [] };

describe('business access', () => {
  it('lets the owner, staff and platform admins in', async () => {
    await expect(assertBusinessAccess(dbWith(biz), 'b1', { id: 'owner' })).resolves.toBeTruthy();
    await expect(
      assertBusinessAccess(dbWith({ ...biz, staff: [{ id: 's' }] }), 'b1', { id: 'staff' }),
    ).resolves.toBeTruthy();
    await expect(
      assertBusinessAccess(dbWith(biz), 'b1', { id: 'x', role: 'SUPER_ADMIN' }),
    ).resolves.toBeTruthy();
  });

  it('refuses someone who merely shares the tenant', async () => {
    await expect(
      assertBusinessAccess(dbWith(biz), 'b1', { id: 'stranger' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('checks the business behind an offer/product/event id', async () => {
    await expect(
      assertResourceAccess(dbWith(biz), 'offer', 'o1', { id: 'stranger' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      assertResourceAccess(dbWith(biz), 'offer', 'o1', { id: 'owner' }),
    ).resolves.toBeTruthy();
  });

  it('404s for a missing record or a platform event with no business', async () => {
    await expect(
      assertResourceAccess(dbWith(biz, null), 'product', 'p1', { id: 'owner' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      assertResourceAccess(dbWith(biz, { businessId: null }), 'event', 'e1', { id: 'owner' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
