import { isFoodCategory } from '@saas/types';
import { getRequirementsForCategory } from './document-requirements';

describe('getRequirementsForCategory', () => {
  it('keeps the built-in slug table unchanged', () => {
    expect(getRequirementsForCategory('food').categorySpecific?.code).toBe('FSSAI_LICENSE');
    expect(getRequirementsForCategory('healthcare').categorySpecific?.code).toBe(
      'HEALTHCARE_REGISTRATION',
    );
  });

  it('keeps Trade License for a built-in slug that had no entry, whatever its template', () => {
    expect(getRequirementsForCategory('restaurants', 'RESTAURANT').categorySpecific?.code).toBe(
      'TRADE_LICENSE',
    );
  });

  it('uses the template document for a category a super admin created', () => {
    expect(getRequirementsForCategory('home_bakeries', 'RESTAURANT').categorySpecific?.code).toBe(
      'FSSAI_LICENSE',
    );
    expect(
      getRequirementsForCategory('pet_clinics', 'HEALTHCARE').categorySpecific?.oneOf?.length,
    ).toBe(4);
  });

  it('falls back to Trade License for an unknown template and nothing for no slug', () => {
    expect(getRequirementsForCategory('mystery', 'BOGUS').categorySpecific?.code).toBe(
      'TRADE_LICENSE',
    );
    expect(getRequirementsForCategory(undefined).categorySpecific).toBeNull();
  });
});

describe('isFoodCategory', () => {
  it('keeps the name/slug rule for built-ins', () => {
    expect(isFoodCategory({ slug: 'buffet', name: 'Buffet' })).toBe(true);
    expect(isFoodCategory({ slug: 'staycation', name: 'Staycation', template: 'RESTAURANT' })).toBe(
      false,
    );
    expect(isFoodCategory({ slug: 'salons', name: 'Salons' })).toBe(false);
  });

  it('lets the template decide for a new category', () => {
    expect(
      isFoodCategory({ slug: 'tiffin_boxes', name: 'Tiffin Boxes', template: 'RESTAURANT' }),
    ).toBe(true);
    expect(isFoodCategory({ slug: 'tiffin_boxes', name: 'Tiffin Boxes', template: 'RETAIL' })).toBe(
      false,
    );
    expect(isFoodCategory(null)).toBe(false);
  });
});
