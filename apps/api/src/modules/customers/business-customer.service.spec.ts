import { BusinessCustomerService, segmentOf } from './business-customer.service';

const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day);

describe('segmentOf', () => {
  it('marks recent first contact as new', () => {
    expect(segmentOf({ firstInteractionDate: ago(3), lastInteractionDate: ago(1), totalVerifiedPurchases: 5 })).toBe('new');
  });
  it('marks repeat customers seen recently as returning', () => {
    expect(segmentOf({ firstInteractionDate: ago(120), lastInteractionDate: ago(10), offersRedeemedCount: 2 })).toBe('returning');
  });
  it('marks a single older visit as one-time', () => {
    expect(segmentOf({ firstInteractionDate: ago(45), lastInteractionDate: ago(40), offersClaimedCount: 1 })).toBe('one-time');
  });
  it('lapsed wins once they have been away 60+ days', () => {
    expect(segmentOf({ firstInteractionDate: ago(200), lastInteractionDate: ago(61), totalVerifiedPurchases: 9 })).toBe('lapsed');
  });
});

describe('BusinessCustomerService.exportCsv', () => {
  it('quotes cells, neutralises formulas and never scopes by tenant', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: '1',
        userId: 'u',
        user: { name: 'Anu, "A"', email: '=HYPERLINK("x")', phone: '+91 98' },
        offersClaimedCount: 2,
        offersRedeemedCount: 1,
        totalVerifiedPurchases: 0,
        firstInteractionDate: ago(100),
        lastInteractionDate: ago(5),
        referralSource: null,
      },
    ]);
    const svc = new BusinessCustomerService({ businessCustomer: { findMany } } as any);
    const csv = await svc.exportCsv('biz-1', 'returning', 'anu');

    const where = findMany.mock.calls[0][0].where;
    expect(where.businessId).toBe('biz-1');
    expect(where.tenantId).toBeUndefined();
    expect(where.user.OR).toHaveLength(3);

    const [header, row] = csv.replace(/^﻿/, '').split('\r\n');
    expect(header.startsWith('Name,Email,Phone,Segment')).toBe(true);
    expect(row).toContain('"Anu, ""A"""');
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain("'+91 98");
    expect(row).toContain(',returning,');
  });
});
