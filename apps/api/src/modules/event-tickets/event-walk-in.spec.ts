import { BadRequestException } from '@nestjs/common';
import { CrewContext } from './event-crew.service';
import { EventScanService } from './event-scan.service';

const ctx: CrewContext = {
  passId: 'p1',
  tenantId: 't1',
  eventId: 'ev1',
  label: 'Gate 1',
  level: 'SCAN',
} as CrewContext;

function setup(over: { status?: string } = {}) {
  const rows: any[] = [];
  const db: any = {
    event: {
      findFirst: jest.fn(async () => ({
        id: 'ev1',
        title: 'Open Mic',
        status: over.status ?? 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
        checkInOpensAt: null,
        checkInClosesAt: null,
        venueCapacity: null,
      })),
    },
    eventWalkIn: {
      findFirst: jest.fn(async ({ where }: any) => {
        const ors = where.OR as { clientRef?: string; phone?: string }[];
        return (
          rows.find((r) => ors.some((o) => o.clientRef === r.clientRef || o.phone === r.phone)) ??
          null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `w${rows.length + 1}`, createdAt: new Date(), ...data };
        rows.push(row);
        return { id: row.id, name: row.name, place: row.place };
      }),
    },
  };
  const redis: any = { get: jest.fn(async () => null), set: jest.fn(), del: jest.fn() };
  return { svc: new EventScanService(db, redis), rows, db, redis };
}

const form = (o: Record<string, unknown> = {}) => ({
  name: '  Ravi   Kumar ',
  phone: '98765 43210',
  place: 'Kochi',
  clientRef: 'ref-12345678',
  consent: true,
  ...o,
});

describe('EventScanService.walkIn', () => {
  it('saves name, mobile and place, tidied, and clears the scanner counts', async () => {
    const { svc, rows, redis } = setup();
    const r = await svc.walkIn(ctx, form());
    expect(r.result).toBe('RECORDED');
    expect(rows[0]).toMatchObject({
      name: 'Ravi Kumar',
      phone: '9876543210',
      place: 'Kochi',
      eventId: 'ev1',
      tenantId: 't1',
      passId: 'p1',
    });
    expect(rows[0].consentedAt).toBeInstanceOf(Date);
    expect(redis.del).toHaveBeenCalledWith('crew:stats:ev1');
  });

  it('is open to a scan-only pass', async () => {
    const { svc } = setup();
    await expect(svc.walkIn({ ...ctx, level: 'SCAN' }, form())).resolves.toMatchObject({
      result: 'RECORDED',
    });
  });

  it('refuses without the volunteer confirming the person agreed', async () => {
    const { svc, rows } = setup();
    await expect(svc.walkIn(ctx, form({ consent: false }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(rows).toHaveLength(0);
  });

  it.each([
    ['a short mobile', { phone: '12345' }],
    ['letters in the mobile', { phone: 'abcdefghij' }],
    ['no name', { name: ' ' }],
    ['no place', { place: ' ' }],
  ])('refuses %s', async (_label, bad) => {
    const { svc, rows } = setup();
    await expect(svc.walkIn(ctx, form(bad))).rejects.toBeInstanceOf(BadRequestException);
    expect(rows).toHaveLength(0);
  });

  it('answers a retry of the same form with the first save, without a second row', async () => {
    const { svc, rows } = setup();
    await svc.walkIn(ctx, form());
    const again = await svc.walkIn(ctx, form());
    expect(again.result).toBe('RECORDED');
    expect(rows).toHaveLength(1);
  });

  it('does not write the same mobile twice for one event', async () => {
    const { svc, rows } = setup();
    await svc.walkIn(ctx, form());
    const r = await svc.walkIn(ctx, form({ clientRef: 'ref-other-0001', name: 'Someone Else' }));
    expect(r.result).toBe('DUPLICATE');
    expect(r.message).toContain('Ravi Kumar');
    expect(rows).toHaveLength(1);
  });

  it('keeps one row when two phones write the same mobile at once', async () => {
    const { svc, db } = setup();
    db.eventWalkIn.create.mockRejectedValueOnce({ code: 'P2002' });
    const r = await svc.walkIn(ctx, form());
    expect(r.result).toBe('DUPLICATE');
  });

  it('refuses when the event is cancelled', async () => {
    const { svc, rows } = setup({ status: 'CANCELLED' });
    await expect(svc.walkIn(ctx, form())).rejects.toBeInstanceOf(BadRequestException);
    expect(rows).toHaveLength(0);
  });
});
