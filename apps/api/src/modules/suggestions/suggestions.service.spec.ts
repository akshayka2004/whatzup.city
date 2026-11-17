import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@saas/types';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { SUGGESTION_LIMITS, THANK_YOU } from './suggestions.constants';

const USER = { id: 'u1', tenantId: 't1', role: 'USER' };
const ADMIN = { id: 'adm1', tenantId: 'tp' };

function setup() {
  const rows: any[] = [];
  const db: any = {
    suggestion: {
      findMany: jest.fn(async ({ where }: any) =>
        rows
          .filter(
            (r) =>
              (where.userId === undefined || r.userId === where.userId) &&
              (!where.createdAt?.gte || +r.createdAt >= +where.createdAt.gte) &&
              (where.status === undefined || r.status === where.status) &&
              (where.topic === undefined || r.topic === where.topic) &&
              !r.deletedAt,
          )
          .map((r) => ({
            ...r,
            user: { id: r.userId, name: 'Asha', email: 'a@x.com', role: 'USER' },
          })),
      ),
      count: jest.fn(
        async ({ where }: any) =>
          rows.filter((r) => !where.status || r.status === where.status).length,
      ),
      groupBy: jest.fn(async () => {
        const by = new Map<string, number>();
        for (const r of rows) by.set(r.status, (by.get(r.status) ?? 0) + 1);
        return [...by].map(([status, n]) => ({ status, _count: { _all: n } }));
      }),
      create: jest.fn(async ({ data }: any) => {
        const r = {
          id: `s${rows.length + 1}`,
          status: 'NEW',
          adminNote: null,
          reviewedAt: null,
          createdAt: new Date(),
          deletedAt: null,
          ...data,
        };
        rows.push(r);
        return { id: r.id };
      }),
      findFirst: jest.fn(
        async ({ where }: any) => rows.find((r) => r.id === where.id && !r.deletedAt) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const r = rows.find((x) => x.id === where.id);
        Object.assign(r, data);
        return { ...r };
      }),
    },
  };
  const audit: any = { log: jest.fn() };
  return { svc: new SuggestionsService(db, audit), db, audit, rows };
}

const MSG = 'Please add a way to save events to my calendar from the list page.';

describe('sending a suggestion', () => {
  it('saves it and returns the thank-you', async () => {
    const { svc, rows } = setup();
    const out = await svc.create(USER, { topic: 'EVENTS', message: MSG, page: '/events' });
    expect(out.thanks).toBe(THANK_YOU);
    expect(out.thanks).toMatch(/thank you/i);
    expect(rows[0]).toMatchObject({
      tenantId: 't1',
      userId: 'u1',
      topic: 'EVENTS',
      message: MSG,
      page: '/events',
      status: 'NEW',
    });
  });

  it('falls back to General for an unknown topic and ignores a page that is not a path', async () => {
    const { svc, rows } = setup();
    await svc.create(USER, { topic: 'NOPE', message: MSG, page: 'https://evil.example' });
    expect(rows[0]).toMatchObject({ topic: 'GENERAL', page: null });
  });

  it('strips markup and tidies spaces before saving', async () => {
    const { svc, rows } = setup();
    await svc.create(USER, {
      message: '  <b>Add   dark</b>   mode please <script>alert(1)</script>  ',
    });
    expect(rows[0].message).toBe('Add dark mode please alert(1)');
  });

  it('refuses a message that is too short or too long, with a plain message', async () => {
    const { svc, rows } = setup();
    await expect(svc.create(USER, { message: 'ok' })).rejects.toThrow(/a little more/);
    await expect(
      svc.create(USER, { message: 'x'.repeat(SUGGESTION_LIMITS.max + 5) }),
    ).rejects.toThrow(/a little long/);
    await expect(svc.create(USER, { message: '<b></b>     ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(rows).toHaveLength(0);
  });

  it('needs an account to attach the suggestion to', async () => {
    const { svc } = setup();
    await expect(svc.create({ id: 'u1' }, { message: MSG })).rejects.toThrow(/account/);
  });

  it('does not save the same suggestion twice (double tap or retry)', async () => {
    const { svc, rows } = setup();
    const a = await svc.create(USER, { message: MSG });
    const b = await svc.create(USER, { message: MSG });
    expect(b.id).toBe(a.id);
    expect(b.thanks).toBe(THANK_YOU);
    expect(rows).toHaveLength(1);
  });

  it('limits how many one person can send in a day', async () => {
    const { svc, rows } = setup();
    for (let i = 0; i < SUGGESTION_LIMITS.perDay; i++) {
      await svc.create(USER, { message: `Suggestion number ${i} for the platform team.` });
    }
    await expect(
      svc.create(USER, { message: 'One more idea for the platform team.' }),
    ).rejects.toMatchObject({
      status: 429,
    });
    await expect(
      svc.create(USER, { message: 'One more idea for the platform team.' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(rows).toHaveLength(SUGGESTION_LIMITS.perDay);
    // Someone else is not affected.
    await expect(
      svc.create({ ...USER, id: 'u2' }, { message: 'My own idea for the platform.' }),
    ).resolves.toBeTruthy();
  });
});

describe('what the admin sees', () => {
  it('lists suggestions with who sent them and a count per status', async () => {
    const { svc } = setup();
    await svc.create(USER, { message: 'First idea for the platform team to read.' });
    await svc.create(
      { ...USER, id: 'u2' },
      { message: 'Second idea for the platform team to read.' },
    );
    const out = await svc.adminList({});
    expect(out.data).toHaveLength(2);
    expect(out.data[0].from).toMatchObject({ name: 'Asha', email: 'a@x.com' });
    expect(out.summary).toMatchObject({ NEW: 2, REVIEWED: 0, PLANNED: 0, DECLINED: 0 });
    expect(out.meta).toMatchObject({ total: 2, page: 1 });
  });

  it('ignores an unknown status or topic filter instead of failing', async () => {
    const { svc, db } = setup();
    await svc.adminList({ status: 'BOGUS', topic: 'ALSO_BOGUS' });
    const where = db.suggestion.findMany.mock.calls[0][0].where;
    expect(where.status).toBeUndefined();
    expect(where.topic).toBeUndefined();
  });

  it('filters by status', async () => {
    const { svc, db } = setup();
    await svc.adminList({ status: 'PLANNED' });
    expect(db.suggestion.findMany.mock.calls[0][0].where.status).toBe('PLANNED');
  });
});

describe('reviewing a suggestion', () => {
  it('records the status, who reviewed it and when, and audits the change', async () => {
    const { svc, audit, rows } = setup();
    const { id } = await svc.create(USER, { message: MSG });
    const out = await svc.review(ADMIN, id, {
      status: 'PLANNED',
      adminNote: 'Ask the events team.',
    });
    expect(out).toMatchObject({ id, status: 'PLANNED', adminNote: 'Ask the events team.' });
    expect(rows[0]).toMatchObject({ status: 'PLANNED', reviewedBy: 'adm1' });
    expect(rows[0].reviewedAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUGGESTION_REVIEWED',
        userId: 'adm1',
        oldData: { status: 'NEW', adminNote: null },
        newData: { status: 'PLANNED', adminNote: 'Ask the events team.' },
      }),
    );
  });

  it('changes nothing, and writes nothing, when nothing is different', async () => {
    const { svc, db, audit } = setup();
    const { id } = await svc.create(USER, { message: MSG });
    await svc.review(ADMIN, id, { status: 'NEW' });
    expect(db.suggestion.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('can clear a note, and refuses an unknown status or suggestion', async () => {
    const { svc, rows } = setup();
    const { id } = await svc.create(USER, { message: MSG });
    await svc.review(ADMIN, id, { adminNote: 'Look at this later.' });
    await svc.review(ADMIN, id, { adminNote: '  ' });
    expect(rows[0].adminNote).toBeNull();
    await expect(svc.review(ADMIN, id, { status: 'BOGUS' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.review(ADMIN, 'missing', { status: 'REVIEWED' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('who may do what', () => {
  const roles = (fn: any) => Reflect.getMetadata(ROLES_KEY, fn);
  const proto = SuggestionsController.prototype;
  it('only the two platform admin roles read or review suggestions', () => {
    expect(roles(proto.adminList)).toEqual([UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN]);
    expect(roles(proto.review)).toEqual([UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN]);
  });
  it('sending one needs no role beyond being signed in', () => {
    expect(roles(proto.create)).toBeUndefined();
  });
});
