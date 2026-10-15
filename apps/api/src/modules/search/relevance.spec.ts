import { relevance } from './search.service';

describe('search relevance', () => {
  const cafe = { name: 'Brew Cafe', category: { name: 'Restaurants' }, averageRating: 0 };
  const salon = {
    name: 'Farah by Nofa',
    category: { name: 'Personal Care' },
    description: 'Bridal studio next to the cafe on MG Road',
    averageRating: 4.8,
  };
  const coffee = { name: 'Kochi Coffee House', category: { name: 'Food' }, averageRating: 3 };

  it('ranks a name match above a description match, even with a lower rating', () => {
    expect(relevance(cafe, 'cafe', [])).toBeGreaterThan(relevance(salon, 'cafe', []));
  });

  it('counts synonym hits, a little below typed words', () => {
    const viaSynonym = relevance(coffee, 'cafe', ['coffee']);
    expect(viaSynonym).toBeGreaterThan(relevance(salon, 'cafe', ['coffee']));
    expect(viaSynonym).toBeLessThan(relevance({ ...coffee, name: 'Cafe Kochi' }, 'cafe', ['coffee']));
  });

  it('treats special characters in the query literally', () => {
    expect(() => relevance(cafe, 'c++ (cafe)', [])).not.toThrow();
  });
});
