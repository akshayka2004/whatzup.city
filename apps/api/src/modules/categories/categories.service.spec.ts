import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@saas/types';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { assertParent, assertSlug, assertIcon, slugify } from './category-rules';

const MASTER = 'tenant-master';
const ACTOR = { id: 'admin-1' };

const cat = (over: Record<string, any> = {}) => ({
  id: 'c-1',
  tenantId: MASTER,
  name: 'Bakeries',
  slug: 'bakeries',
  parentId: null,
  isActive: true,
  isSystem: false,
  template: 'RESTAURANT',
  sortOrder: 10,
  deletedAt: null,
  ...over,
});

function makeService() {
  const tx: any = {
    category: {
      update: jest.fn(async ({ data }) => ({ ...cat(), ...data })),
      updateMany: jest.fn(),
    },
    business: { updateMany: jest.fn() },
    $executeRaw: jest.fn(),
  };
  const db: any = {
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }) => ({ id: 'c-new', ...data })),
      deleteMany: jest.fn(),
      aggregate: jest.fn(async () => ({ _max: { sortOrder: 20 } })),
    },
    business: { findMany: jest.fn(async () => []), groupBy: jest.fn(async () => []) },
    $queryRaw: jest.fn(async () => []),
    $transaction: jest.fn(async (fn: any) => (typeof fn === 'function' ? fn(tx) : Promise.all(fn))),
  };
  const redis: any = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delPattern: jest.fn() };
  const tenantResolver: any = { resolveTenantId: jest.fn(async () => MASTER) };
  const audit: any = { log: jest.fn() };
  const search: any = { indexBusiness: jest.fn() };
  const notifications: any = { send: jest.fn() };
  const service = new CategoriesService(redis, tenantResolver, db, audit, search, notifications);
  return { service, db, tx, redis, audit, notifications };
}

describe('category rules', () => {
  it('slugifies names', () => {
    expect(slugify('Fast-food  Chains!')).toBe('fast_food_chains');
  });
  it('rejects malformed slugs and unknown icons', () => {
    expect(() => assertSlug('Bad Slug')).toThrow(BadRequestException);
    expect(() => assertSlug('a')).toThrow(BadRequestException);
    expect(() => assertSlug('good_slug_2')).not.toThrow();
    expect(() => assertIcon('NotAnIcon')).toThrow(BadRequestException);
    expect(() => assertIcon('Store')).not.toThrow();
  });
  it('caps depth at two levels and blocks loops', () => {
    expect(() => assertParent(null, { id: 'p', parentId: 'gp' })).toThrow(/levels deep/);
    expect(() => assertParent({ id: 'p' }, { id: 'p', parentId: null })).toThrow(/own parent/);
    expect(() => assertParent({ id: 'x', hasChildren: true }, { id: 'p', parentId: null })).toThrow(
      /subcategories/,
    );
    expect(() => assertParent({ id: 'x' }, { id: 'p', parentId: null })).not.toThrow();
  });
});

describe('CategoriesController roles', () => {
  const roles = (fn: any) => Reflect.getMetadata(ROLES_KEY, fn);
  const proto = CategoriesController.prototype;
  it('only SUPER_ADMIN writes', () => {
    for (const m of ['create', 'update', 'merge', 'remove', 'reorder'] as const) {
      expect(roles(proto[m])).toEqual([UserRole.SUPER_ADMIN]);
    }
  });
  it('MASTER_ADMIN can read the admin list and impact', () => {
    expect(roles(proto.adminList)).toContain(UserRole.MASTER_ADMIN);
    expect(roles(proto.impact)).toContain(UserRole.MASTER_ADMIN);
  });
});

describe('CategoriesService.create', () => {
  it('creates in the master tenant, writes an audit row and clears caches', async () => {
    const { service, db, audit, redis } = makeService();
    db.category.findFirst.mockResolvedValue(null);
    const res = await service.create(ACTOR, { name: ' Home  Bakeries ', template: 'RESTAURANT' });
    expect(res.slug).toBe('home_bakeries');
    expect(db.category.create.mock.calls[0][0].data).toMatchObject({
      tenantId: MASTER,
      name: 'Home Bakeries',
      template: 'RESTAURANT',
      isSystem: false,
      sortOrder: 30,
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CATEGORY_CREATED' }));
    expect(redis.delPattern).toHaveBeenCalledWith('categories:*');
  });

  it('refuses a slug that is taken, even by a retired category', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue({ id: 'old', deletedAt: new Date() });
    await expect(service.create(ACTOR, { name: 'Bakeries' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('refuses a third level', async () => {
    const { service, db } = makeService();
    db.category.findFirst
      .mockResolvedValueOnce(null) // slug free
      .mockResolvedValueOnce({ id: 'sub', parentId: 'top', template: null }); // parent is already a child
    await expect(
      service.create(ACTOR, { name: 'Deep', parentId: '11111111-1111-1111-1111-111111111111' }),
    ).rejects.toThrow(/levels deep/);
  });

  it('refuses a duplicate sibling name (case-insensitive)', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(null);
    db.category.findMany.mockResolvedValue([{ name: 'BAKERIES' }]);
    await expect(
      service.create(ACTOR, { name: 'bakeries', slug: 'bakeries_2' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses an unknown template or icon', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(null);
    await expect(service.create(ACTOR, { name: 'X Y', template: 'NOPE' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.create(ACTOR, { name: 'X Y', icon: 'Bogus' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('CategoriesService.update', () => {
  it('locks the slug once a business uses the category', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(cat());
    db.category.findMany.mockResolvedValue([{ id: 'c-1' }]); // idsForSlug
    db.business.findMany.mockResolvedValue([{ id: 'b-1', tenantId: 't', ownerId: 'o', name: 'B' }]);
    await expect(service.update(ACTOR, 'c-1', { slug: 'new_slug' })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SLUG_LOCKED' }),
    });
  });

  it('allows a slug change while unused', async () => {
    const { service, db, tx } = makeService();
    db.category.findFirst
      .mockResolvedValueOnce(cat()) // getMaster
      .mockResolvedValueOnce(null); // clash check
    db.category.findMany.mockResolvedValue([{ id: 'c-1' }]);
    await service.update(ACTOR, 'c-1', { slug: 'new_slug' });
    expect(tx.category.update.mock.calls[0][0].data.slug).toBe('new_slug');
  });

  it('never changes the slug of a built-in category', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(cat({ slug: 'food', isSystem: true }));
    await expect(service.update(ACTOR, 'c-1', { slug: 'meals' })).rejects.toThrow(/built-in/);
  });

  it('never archives a built-in category', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(cat({ slug: 'food', isSystem: true }));
    await expect(service.update(ACTOR, 'c-1', { isActive: false })).rejects.toThrow(/built-in/);
  });

  it('rename is audited with before/after and mirrors onto legacy clones', async () => {
    const { service, db, tx, audit } = makeService();
    db.category.findFirst.mockResolvedValue(cat());
    db.category.findMany.mockResolvedValue([]); // sibling names
    await service.update(ACTOR, 'c-1', { name: 'Bake Shops' });
    expect(tx.category.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Bake Shops' } }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CATEGORY_UPDATED',
        oldData: { name: 'Bakeries' },
        newData: expect.objectContaining({ name: 'Bake Shops' }),
      }),
    );
  });
});

describe('CategoriesService.remove', () => {
  it('refuses with the impact when businesses use the category', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(cat());
    db.category.findMany.mockResolvedValue([{ id: 'c-1' }]);
    db.business.findMany.mockResolvedValue([
      {
        id: 'b-1',
        tenantId: 't',
        ownerId: 'o',
        name: 'B',
        status: 'APPROVED',
        launchOfferClaimedAt: null,
      },
    ]);
    await expect(service.remove(ACTOR, 'c-1')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CATEGORY_IN_USE',
        details: expect.objectContaining({ businesses: 1 }),
      }),
    });
    expect(db.category.deleteMany).not.toHaveBeenCalled();
  });

  it('hard-deletes an unused category and its legacy clones', async () => {
    const { service, db, audit } = makeService();
    db.category.findFirst.mockResolvedValue(cat());
    db.category.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'clone-1' }]);
    await service.remove(ACTOR, 'c-1');
    expect(db.category.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['c-1', 'clone-1'] } },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CATEGORY_DELETED' }));
  });

  it('refuses to delete a built-in category', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(cat({ isSystem: true }));
    await expect(service.remove(ACTOR, 'c-1')).rejects.toThrow(/built-in/);
  });

  it('404s for a category outside the master list', async () => {
    const { service, db } = makeService();
    db.category.findFirst.mockResolvedValue(null);
    await expect(service.remove(ACTOR, 'c-x')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CategoriesService.merge', () => {
  const src = cat({ id: 'src', slug: 'cafes' });
  const dst = cat({ id: 'dst', slug: 'restaurants', name: 'Restaurants' });

  it('repoints businesses and subcategory ids, retires the source, notifies owners, audits', async () => {
    const { service, db, tx, audit, notifications } = makeService();
    db.category.findFirst.mockResolvedValueOnce(src).mockResolvedValueOnce(dst);
    db.category.findMany.mockResolvedValue([{ id: 'src' }, { id: 'src-clone' }]);
    db.business.findMany.mockResolvedValue([
      { id: 'b-1', tenantId: 't-1', ownerId: 'o-1', name: 'Cafe One', status: 'APPROVED' },
    ]);
    db.$queryRaw.mockResolvedValue([{ id: 'b-2', tenant_id: 't-2' }]);

    const res = await service.merge(ACTOR, 'src', 'dst');

    expect(tx.business.updateMany).toHaveBeenCalledWith({
      where: { categoryId: { in: ['src', 'src-clone'] }, deletedAt: null },
      data: { categoryId: 'dst' },
    });
    expect(tx.$executeRaw).toHaveBeenCalled(); // subcategory_ids rewrite
    const retire = tx.category.updateMany.mock.calls.at(-1)[0];
    expect(retire.where).toEqual({ id: { in: ['src', 'src-clone'] } });
    expect(retire.data).toMatchObject({ isActive: false, mergedIntoId: 'dst' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CATEGORY_MERGED',
        metadata: expect.objectContaining({ businessesMoved: 1, subcategoryRefsMoved: 1 }),
      }),
    );
    expect(res.businessesMoved).toBe(1);
    await new Promise((r) => setImmediate(r));
    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'o-1', tenantId: 't-1' }),
    );
  });

  it('refuses merging into itself, into an archived target, across levels, or a built-in source', async () => {
    const a = makeService();
    await expect(a.service.merge(ACTOR, 'x', 'x')).rejects.toBeInstanceOf(BadRequestException);

    const b = makeService();
    b.db.category.findFirst
      .mockResolvedValueOnce(src)
      .mockResolvedValueOnce({ ...dst, isActive: false });
    await expect(b.service.merge(ACTOR, 'src', 'dst')).rejects.toThrow(/active/);

    const c = makeService();
    c.db.category.findFirst
      .mockResolvedValueOnce(src)
      .mockResolvedValueOnce({ ...dst, parentId: 'p' });
    await expect(c.service.merge(ACTOR, 'src', 'dst')).rejects.toThrow(/same level/);

    const d = makeService();
    d.db.category.findFirst
      .mockResolvedValueOnce({ ...src, isSystem: true })
      .mockResolvedValueOnce(dst);
    await expect(d.service.merge(ACTOR, 'src', 'dst')).rejects.toThrow(/built-in/);
  });
});

describe('CategoriesService.reorder', () => {
  it('refuses ids that do not share a parent', async () => {
    const { service, db } = makeService();
    db.category.findMany.mockResolvedValue([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'p' },
    ]);
    await expect(service.reorder(ACTOR, ['a', 'b'])).rejects.toBeInstanceOf(BadRequestException);
  });
});
