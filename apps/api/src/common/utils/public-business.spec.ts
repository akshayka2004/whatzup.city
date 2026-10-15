import { toPublicBusiness } from './public-business';

describe('toPublicBusiness', () => {
  const row = {
    id: 'b1',
    name: 'Casa',
    slug: 'casa',
    city: 'Kochi',
    phone: '0484 000000',
    ownerId: 'u1',
    ownerName: 'Owner',
    email: 'owner@example.test',
    compliance: { gstin: 'X', pan: 'Y' },
    ownerContact: { phone: '1' },
    billingContact: { email: 'b@example.test' },
    supportContact: { phone: '2' },
    branchHead: { name: 'H' },
    categoryAttributes: { secret: true },
    trialStatus: 'ACTIVE',
    billSeriesPrefix: 'CMA',
    createdBy: 'u1',
    category: { id: 'c1', name: 'Retail', slug: 'retail', tenantId: 't', deletedAt: null },
    branches: [{ id: 'br1', name: 'Main', phone: '3', managerEmail: 'm@example.test' }],
    activeOfferCount: 2,
  };

  it('keeps what the public profile renders', () => {
    const out = toPublicBusiness(row);
    expect(out).toMatchObject({ id: 'b1', name: 'Casa', city: 'Kochi', activeOfferCount: 2 });
    expect(out.category).toEqual({ id: 'c1', name: 'Retail', slug: 'retail' });
    expect(out.branches).toEqual([{ id: 'br1', name: 'Main', phone: '3' }]);
  });

  it('drops registration, contact and internal fields', () => {
    const out = toPublicBusiness(row);
    for (const k of [
      'ownerId',
      'ownerName',
      'email',
      'compliance',
      'ownerContact',
      'billingContact',
      'supportContact',
      'branchHead',
      'categoryAttributes',
      'trialStatus',
      'billSeriesPrefix',
      'createdBy',
    ]) {
      expect(out).not.toHaveProperty(k);
    }
  });

  it('passes null through', () => {
    expect(toPublicBusiness(null)).toBeNull();
  });
});
