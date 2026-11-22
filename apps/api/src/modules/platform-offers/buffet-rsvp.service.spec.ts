import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { istDay } from '@saas/types';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '@saas/types';
import { PlatformOffersController } from './platform-offers.controller';
import { BuffetRsvpService, RSVP_LIMITS, RSVP_THANKS } from './buffet-rsvp.service';

const USER = { id: 'u1', tenantId: 't1' };
const DAY = 86_400_000;
const inDays = (n: number) => istDay(Date.now() + n * DAY);

function setup(offerOver: any = {}) {
  const rows: any[] = [];
  const offer = {
    id: 'o1',
    tenantId: 't1',
    category: 'BUFFET',
    status: 'PUBLISHED',
    deletedAt: null,
    endsAt: null,
    details: {},
    ...offerOver,
  };
  const db: any = {
    platformOffer: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === offer.id &&
        where.category === 'BUFFET' &&
        where.status === 'PUBLISHED' &&
        offer.category === 'BUFFET' &&
        offer.status === 'PUBLISHED'
          ? offer
          : null,
      ),
    },
    buffetRsvp: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.userId && where.offerId)
          return (
            rows.find(
              (r) =>
                r.offerId === where.offerId &&
                r.userId === where.userId &&
                +r.visitDate === +where.visitDate &&
                r.status !== 'CANCELLED',
            ) ?? null
          );
        return (
          rows.find((r) => r.id === where.id && (!where.userId || r.userId === where.userId)) ??
          null
        );
      }),
      count: jest.fn(
        async ({ where }: any) =>
          rows.filter(
            (r) =>
              (!where.userId || r.userId === where.userId) &&
              (!where.status?.not || r.status !== where.status.not) &&
              (typeof where.status !== 'string' || r.status === where.status),
          ).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const r = {
          id: `r${rows.length + 1}`,
          status: 'PENDING',
          adminNote: null,
          createdAt: new Date(),
          ...data,
        };
        rows.push(r);
        return { id: r.id };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const r = rows.find((x) => x.id === where.id);
        Object.assign(r, data);
        return { ...r };
      }),
      findMany: jest.fn(async () =>
        rows.map((r) => ({
          ...r,
          offer: { id: 'o1', title: 'Grand Buffet', city: 'Kochi', phone: '1' },
          user: { id: r.userId, email: 'a@x.com' },
        })),
      ),
    },
  };
  const audit: any = { log: jest.fn() };
  return { svc: new BuffetRsvpService(db, audit), db, audit, rows };
}

const good = (over: any = {}) => ({
  name: 'Asha Nair',
  phone: '+91 98470 12345',
  visitDate: inDays(3),
  guests: 4,
  ...over,
});

describe('sending a buffet RSVP', () => {
  it('saves the request and returns the thank-you', async () => {
    const { svc, rows } = setup();
    const out = await svc.create(USER, 'o1', good({ note: ' <b>window</b> table ' }));
    expect(out.thanks).toBe(RSVP_THANKS);
    expect(rows[0]).toMatchObject({
      tenantId: 't1',
      offerId: 'o1',
      userId: 'u1',
      name: 'Asha Nair',
      phone: '+919847012345',
      guests: 4,
      status: 'PENDING',
      note: 'window table',
    });
    expect(rows[0].visitDate.toISOString()).toBe(`${inDays(3)}T00:00:00.000Z`);
  });

  it('accepts today, refuses yesterday and far-future days', async () => {
    const { svc } = setup();
    await expect(svc.create(USER, 'o1', good({ visitDate: inDays(0) }))).resolves.toBeTruthy();
    await expect(svc.create(USER, 'o1', good({ visitDate: inDays(-1) }))).rejects.toThrow(
      /today or a day ahead/,
    );
    await expect(
      svc.create(USER, 'o1', good({ visitDate: inDays(RSVP_LIMITS.aheadDays + 2) })),
    ).rejects.toThrow(/days ahead/);
    await expect(svc.create(USER, 'o1', good({ visitDate: 'tomorrow' }))).rejects.toThrow(
      /Pick the day/,
    );
  });

  it('checks name, phone and guests with plain messages', async () => {
    const { svc, rows } = setup();
    await expect(svc.create(USER, 'o1', good({ name: ' ' }))).rejects.toThrow(/name/);
    await expect(svc.create(USER, 'o1', good({ phone: '12345' }))).rejects.toThrow(/phone number/);
    await expect(svc.create(USER, 'o1', good({ guests: 0 }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.create(USER, 'o1', good({ guests: 51 }))).rejects.toThrow(/between 1 and 50/);
    await expect(svc.create(USER, 'o1', good({ guests: 2.5 }))).resolves.toBeTruthy();
    expect(rows).toHaveLength(1);
    expect(rows[0].guests).toBe(2);
  });

  it('needs an account', async () => {
    const { svc } = setup();
    await expect(svc.create({ id: 'u1' }, 'o1', good())).rejects.toThrow(/account/);
  });

  it('only works for a published buffet', async () => {
    const a = setup({ status: 'UNPUBLISHED' });
    await expect(a.svc.create(USER, 'o1', good())).rejects.toBeInstanceOf(NotFoundException);
    const b = setup({ category: 'SADYA' });
    await expect(b.svc.create(USER, 'o1', good())).rejects.toBeInstanceOf(NotFoundException);
    const c = setup();
    await expect(c.svc.create(USER, 'nope', good())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a day after the buffet ends, and when RSVPs are closed', async () => {
    const ended = setup({ endsAt: new Date(Date.now() + 2 * DAY) });
    await expect(ended.svc.create(USER, 'o1', good({ visitDate: inDays(5) }))).rejects.toThrow(
      /not running/,
    );
    await expect(
      ended.svc.create(USER, 'o1', good({ visitDate: inDays(1) })),
    ).resolves.toBeTruthy();
    const closed = setup({ details: { rsvpOpen: false } });
    await expect(closed.svc.create(USER, 'o1', good())).rejects.toThrow(/closed/);
  });

  it('does not take the same day twice, but a cancelled one can be redone', async () => {
    const { svc, rows } = setup();
    await svc.create(USER, 'o1', good());
    await expect(svc.create(USER, 'o1', good())).rejects.toBeInstanceOf(ConflictException);
    rows[0].status = 'CANCELLED';
    await expect(svc.create(USER, 'o1', good())).resolves.toBeTruthy();
  });

  it('caps how many open RSVPs one person holds', async () => {
    const { svc } = setup();
    for (let i = 0; i < RSVP_LIMITS.activePerPerson; i++) {
      await svc.create(USER, 'o1', good({ visitDate: inDays(i + 1) }));
    }
    await expect(svc.create(USER, 'o1', good({ visitDate: inDays(40) }))).rejects.toThrow(
      /many open RSVPs/,
    );
  });
});

describe('my RSVPs and the admin queue', () => {
  it('lists mine and cancels only my own', async () => {
    const { svc, rows } = setup();
    await svc.create(USER, 'o1', good());
    const mine = await svc.mine(USER);
    expect(mine[0]).toMatchObject({
      guests: 4,
      status: 'PENDING',
      buffet: { title: 'Grand Buffet' },
    });
    await expect(svc.cancelMine({ id: 'u2', tenantId: 't1' }, rows[0].id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(svc.cancelMine(USER, rows[0].id)).resolves.toMatchObject({ status: 'CANCELLED' });
    expect(rows[0].status).toBe('CANCELLED');
  });

  it('admin list carries who asked, and the pending count', async () => {
    const { svc, db } = setup();
    await svc.create(USER, 'o1', good());
    db.buffetRsvp.count = jest.fn(async () => 1);
    const out = await svc.adminList({ status: 'PENDING', upcoming: 'true', page: 1 });
    expect(out.data[0]).toMatchObject({
      name: 'Asha Nair',
      email: 'a@x.com',
      buffet: { city: 'Kochi' },
    });
    expect(out.pending).toBe(1);
    const where = db.buffetRsvp.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PENDING');
    expect(where.visitDate.gte).toBeInstanceOf(Date);
  });

  it('ignores an unknown status filter instead of failing', async () => {
    const { svc, db } = setup();
    await svc.adminList({ status: 'BOGUS' });
    expect(db.buffetRsvp.findMany.mock.calls[0][0].where.status).toBeUndefined();
  });

  it('review records the change and audits it; a no-op writes nothing', async () => {
    const { svc, audit, rows, db } = setup();
    await svc.create(USER, 'o1', good());
    const out = await svc.review({ id: 'adm' }, rows[0].id, {
      status: 'CONFIRMED',
      adminNote: 'Table 7',
    });
    expect(out).toMatchObject({ status: 'CONFIRMED', adminNote: 'Table 7' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BUFFET_RSVP_REVIEWED', userId: 'adm' }),
    );
    db.buffetRsvp.update.mockClear();
    audit.log.mockClear();
    await svc.review({ id: 'adm' }, rows[0].id, { status: 'CONFIRMED' });
    expect(db.buffetRsvp.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    await expect(svc.review({ id: 'adm' }, rows[0].id, { status: 'WAT' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.review({ id: 'adm' }, 'missing', { status: 'CONFIRMED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('who may do what with RSVPs', () => {
  const roles = (fn: any) => Reflect.getMetadata(ROLES_KEY, fn);
  const proto = PlatformOffersController.prototype;
  it('only admins and staff read or review the queue', () => {
    for (const fn of [proto.adminRsvps, proto.reviewRsvp]) {
      expect(roles(fn)).toEqual([
        UserRole.MASTER_ADMIN,
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_STAFF,
      ]);
    }
  });
  it('sending, listing and cancelling my own need only a signed-in account', () => {
    for (const fn of [proto.rsvp, proto.myRsvps, proto.cancelRsvp])
      expect(roles(fn)).toBeUndefined();
  });
});
