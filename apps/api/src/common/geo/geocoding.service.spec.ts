import { geocodeQuery, inKerala } from './geocoding.service';

describe('geocoding helpers', () => {
  it('builds a most-specific-first query and skips empty parts', () => {
    expect(
      geocodeQuery({
        address: 'C V Raman Pillai Road',
        city: 'Thiruvananthapuram',
        zipCode: '695014',
      }),
    ).toBe('C V Raman Pillai Road, Thiruvananthapuram, 695014, Kerala, India');
  });

  it('refuses to guess without an address or city', () => {
    expect(geocodeQuery({ state: 'Kerala' })).toBeNull();
  });

  it('accepts Kerala and rejects elsewhere', () => {
    expect(inKerala(9.98, 76.28)).toBe(true); // Kochi
    expect(inKerala(12.97, 77.59)).toBe(false); // Bengaluru
  });
});
