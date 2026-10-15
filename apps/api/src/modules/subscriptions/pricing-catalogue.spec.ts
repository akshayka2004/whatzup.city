import { CATALOGUE, cycleDays, priceCart, unitPrice, withTax } from '@saas/types';

describe('pricing catalogue', () => {
  it('matches the boss price sheet (ex-GST)', () => {
    const p = (code: string) => [unitPrice(code, 'MONTHLY'), unitPrice(code, 'YEARLY')];
    expect(p('ADDON_OFFER')).toEqual([99, null]);
    expect(p('ADDON_OV')).toEqual([149, 949]);
    expect(p('ADDON_OV_AN')).toEqual([199, 999]);
    expect(p('SINGLE')).toEqual([349, 3499]);
    expect(p('SINGLE_AN')).toEqual([399, 3999]);
    expect(p('MULTI')).toEqual([319, 3199]);
    expect(p('MULTI_AN')).toEqual([339, 3399]);
  });

  it('codes are unique and cycles have the agreed lengths', () => {
    expect(new Set(CATALOGUE.map((c) => c.code)).size).toBe(CATALOGUE.length);
    expect([cycleDays('MONTHLY'), cycleDays('YEARLY')]).toEqual([30, 365]);
  });

  it('adds 18% GST on top, rounded to the rupee', () => {
    expect(withTax(99)).toEqual({ base: 99, tax: 18, total: 117 });
    expect(withTax(3499)).toEqual({ base: 3499, tax: 630, total: 4129 });
  });

  it('prices a bundle plus stacked add-ons', () => {
    const r = priceCart(
      [
        { code: 'SINGLE', quantity: 1 },
        { code: 'ADDON_OV', quantity: 2 },
      ],
      'MONTHLY',
    );
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.cart.totals).toEqual({
        base: 349 + 298,
        tax: Math.round((647 * 18) / 100),
        total: 647 + 116,
      });
  });

  it('rejects: add-on with no yearly price, two bundles, bad qty, unknown code, empty, quarterly', () => {
    expect(priceCart([{ code: 'ADDON_OFFER', quantity: 1 }], 'YEARLY').ok).toBe(false);
    expect(
      priceCart(
        [
          { code: 'SINGLE', quantity: 1 },
          { code: 'MULTI', quantity: 1 },
        ],
        'MONTHLY',
      ).ok,
    ).toBe(false);
    expect(priceCart([{ code: 'ADDON_OV', quantity: 0 }], 'MONTHLY').ok).toBe(false);
    expect(priceCart([{ code: 'NOPE', quantity: 1 }], 'MONTHLY').ok).toBe(false);
    expect(priceCart([], 'MONTHLY').ok).toBe(false);
    expect(priceCart([{ code: 'SINGLE', quantity: 1 }], 'QUARTERLY').ok).toBe(false);
  });
});
