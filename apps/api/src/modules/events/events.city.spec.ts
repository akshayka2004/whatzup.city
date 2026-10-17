import { EventsService } from './events.service';

function make() {
  const db: any = {
    event: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
  };
  const service = new (EventsService as any)(db, {}, {}, {}, {}, {}, {});
  return { service: service as EventsService, db };
}

describe('EventsService.findPublicActive city filter', () => {
  it('no city: only active, unexpired events', async () => {
    const { service, db } = make();
    await service.findPublicActive();
    expect(db.event.findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });

  it('a city matches its own events, targeted events, and cityless ones, not every event', async () => {
    const { service, db } = make();
    await service.findPublicActive(' Kochi ');
    const or = db.event.findMany.mock.calls[0][0].where.OR;
    expect(or).toEqual([
      { city: { equals: 'Kochi', mode: 'insensitive' } },
      { targetCities: { array_contains: 'Kochi' } },
      { AND: [{ city: null }, { targetCities: { equals: [] } }] },
    ]);
    // The old filter included `{ targetCities: { equals: [] } }` alone, which matched every
    // event that had no explicit target list (i.e. all of them).
    expect(or).not.toContainEqual({ targetCities: { equals: [] } });
  });
});
