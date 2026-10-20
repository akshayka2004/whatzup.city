import { validSubType, PlatformOfferCategoryEnum } from './dto/platform-offer.dto';

describe('platform offer categories and sub types', () => {
  it('accepts the new categories', () => {
    for (const c of [
      'FESTIVE',
      'DINE_IN',
      'TAKEAWAY',
      'HYPERMARKET',
      'JEWELLERY',
      'STATIONERY',
      'FOOD',
    ]) {
      expect(Object.values(PlatformOfferCategoryEnum)).toContain(c);
    }
  });

  it('new categories take dine in / takeaway / online / offline, or nothing', () => {
    for (const m of ['DINE_IN', 'TAKEAWAY', 'ONLINE', 'OFFLINE']) {
      expect(validSubType('JEWELLERY', m)).toBe(m);
    }
    expect(validSubType('FOOD', undefined)).toBeNull();
    expect(validSubType('FOOD', 'PROPERTY')).toBeNull();
  });

  it('staycation keeps property/day-out and rejects modes', () => {
    expect(validSubType('STAYCATION', 'PROPERTY')).toBe('PROPERTY');
    expect(validSubType('STAYCATION', 'DAYOUT')).toBe('DAYOUT');
    expect(validSubType('STAYCATION', 'ONLINE')).toBeNull();
  });

  it('older categories never carry a sub type', () => {
    expect(validSubType('SADYA', 'ONLINE')).toBeNull();
    expect(validSubType('CLOTHING', 'PROPERTY')).toBeNull();
  });
});
