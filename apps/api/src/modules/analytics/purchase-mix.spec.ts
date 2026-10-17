import { foldPurchaseMix, type MixRow } from './purchase-mix';

const row = (over: Partial<MixRow>): MixRow => ({
  channel: null,
  payment: null,
  partner: null,
  partnerName: null,
  city: 'Kochi',
  bills: 1,
  spend: 100,
  ...over,
});

describe('foldPurchaseMix', () => {
  it('splits channels, payment modes and delivery apps; totals reconcile', () => {
    const mix = foldPurchaseMix([
      row({ channel: 'IN_STORE', payment: 'UPI', bills: 3, spend: 900 }),
      row({ channel: 'IN_STORE', payment: 'CASH', bills: 2, spend: 400 }),
      row({ channel: 'TAKEAWAY', payment: 'UPI', bills: 1, spend: 150 }),
      row({ channel: 'DELIVERY', partner: 'SWIGGY', bills: 4, spend: 1200 }),
      row({ channel: 'DELIVERY', partner: 'ZOMATO', bills: 2, spend: 500 }),
      row({ channel: null, bills: 5, spend: 2000 }),
    ]);
    expect(mix.totalBills).toBe(17);
    expect(mix.totalSpend).toBe(5150);
    expect(mix.recordedBills).toBe(12);
    expect(mix.channels.map((c) => [c.key, c.bills])).toEqual(
      [
        ['NOT_RECORDED', 5],
        ['IN_STORE', 5],
        ['DELIVERY', 6],
        ['TAKEAWAY', 1],
      ].sort((a, b) => (b[1] as number) - (a[1] as number)),
    );
    expect(mix.payments.find((p) => p.key === 'UPI')).toMatchObject({ bills: 4, spend: 1050 });
    expect(mix.payments.find((p) => p.key === 'CASH')?.bills).toBe(2);
    expect(mix.deliveryPartners.map((p) => p.label)).toEqual(['Swiggy', 'Zomato']);
  });

  it('keeps typed "other" delivery apps apart by name and tolerates case', () => {
    const mix = foldPurchaseMix([
      row({ channel: 'DELIVERY', partner: 'OTHER', partnerName: 'Dunzo', bills: 2 }),
      row({ channel: 'DELIVERY', partner: 'OTHER', partnerName: ' dunzo ', bills: 1 }),
      row({ channel: 'DELIVERY', partner: 'OTHER', partnerName: 'Magicpin', bills: 1 }),
      row({ channel: 'DELIVERY', partner: 'OTHER', partnerName: '', bills: 1 }),
    ]);
    const byLabel = Object.fromEntries(mix.deliveryPartners.map((p) => [p.label, p.bills]));
    expect(byLabel).toMatchObject({ Dunzo: 3, Magicpin: 1, Other: 1 });
  });

  it('delivery bills never count as a payment mode', () => {
    const mix = foldPurchaseMix([row({ channel: 'DELIVERY', partner: 'PLENTI', payment: 'UPI' })]);
    expect(mix.payments).toEqual([]);
  });

  it('groups cities case-insensitively with a channel split, busiest first, capped', () => {
    const mix = foldPurchaseMix(
      [
        row({ channel: 'IN_STORE', payment: 'CASH', city: 'Kochi', bills: 2, spend: 200 }),
        row({ channel: 'DELIVERY', partner: 'SWIGGY', city: 'kochi', bills: 3, spend: 300 }),
        row({ channel: 'TAKEAWAY', payment: 'UPI', city: 'Kollam', bills: 1 }),
        row({ channel: 'IN_STORE', payment: 'UPI', city: null, bills: 1 }),
      ],
      2,
    );
    expect(mix.cities).toHaveLength(2);
    expect(mix.cities[0]).toMatchObject({
      city: 'Kochi',
      bills: 5,
      spend: 500,
      inStore: 2,
      delivery: 3,
    });
  });
});
