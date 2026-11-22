import { BadRequestException } from '@nestjs/common';
import { validSubType, PlatformOfferCategoryEnum } from './dto/platform-offer.dto';
import { checkBuffet } from './platform-offers.service';

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
      'CHRISTMAS_CAKES',
      'BUFFET',
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

describe('christmas cakes', () => {
  it('carry plum, rich plum, ice cake or other, and nothing else', () => {
    for (const k of ['PLUM', 'RICH_PLUM', 'ICE_CAKE', 'OTHER_CAKE']) {
      expect(validSubType('CHRISTMAS_CAKES', k)).toBe(k);
    }
    expect(validSubType('CHRISTMAS_CAKES', 'DINE_IN')).toBeNull();
    expect(validSubType('CHRISTMAS_CAKES', 'PROPERTY')).toBeNull();
    expect(validSubType('CHRISTMAS_CAKES', undefined)).toBeNull();
  });

  it('cake kinds are not accepted by other categories', () => {
    for (const c of ['SADYA', 'FOOD', 'STAYCATION', 'BUFFET', 'DINE_IN']) {
      expect(validSubType(c, 'PLUM')).toBeNull();
      expect(validSubType(c, 'ICE_CAKE')).toBeNull();
    }
  });
});

describe('buffets', () => {
  it('have no sub type', () => {
    expect(validSubType('BUFFET', 'DINE_IN')).toBeNull();
  });

  it('need a city', () => {
    expect(() => checkBuffet('BUFFET', '', {})).toThrow(BadRequestException);
    expect(() => checkBuffet('BUFFET', '   ', {})).toThrow(/city/);
    expect(() => checkBuffet('BUFFET', null, {})).toThrow(/city/);
    expect(() => checkBuffet('BUFFET', 'Pathanamthitta', {})).not.toThrow();
  });

  it('other categories are left alone, with or without a city', () => {
    const d = { anything: 1 };
    expect(checkBuffet('SADYA', null, d)).toBe(d);
    expect(checkBuffet('CHRISTMAS_CAKES', null, undefined)).toBeUndefined();
  });

  it('keep timings, group discount and a clean map link; strip markup', () => {
    const out: any = checkBuffet('BUFFET', 'Kochi', {
      timings: ' <b>Lunch 12:30 to 3:30</b> ',
      groupDiscount: '10% for 10 or more',
      mapLink: 'https://maps.app.goo.gl/abc',
      pricePerPax: '₹899',
    });
    expect(out).toMatchObject({
      timings: 'Lunch 12:30 to 3:30',
      groupDiscount: '10% for 10 or more',
      mapLink: 'https://maps.app.goo.gl/abc',
      pricePerPax: '₹899',
      rsvpOpen: true,
    });
  });

  it('refuse a map link that is not http(s)', () => {
    for (const bad of ['javascript:alert(1)', 'maps.google.com/x', 'ftp://x.y']) {
      expect(() => checkBuffet('BUFFET', 'Kochi', { mapLink: bad })).toThrow(/http/);
    }
  });

  it('drop empty fields and keep RSVPs closed when the admin closes them', () => {
    const out: any = checkBuffet('BUFFET', 'Kochi', {
      timings: '  ',
      groupDiscount: '',
      rsvpOpen: false,
    });
    expect(out.timings).toBeUndefined();
    expect(out.groupDiscount).toBeUndefined();
    expect(out.rsvpOpen).toBe(false);
  });
});
