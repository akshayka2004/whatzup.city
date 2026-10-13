import { BadRequestException } from '@nestjs/common';
import { planCategoryConsolidation, remapIds } from '@saas/types';
import { resolveMasterCategory, resolveMasterSubcategories } from './master-category';

function makeDb() {
  return {
    tenant: { findUnique: jest.fn(async () => ({ id: 'master' })) },
    category: { findFirst: jest.fn(), findMany: jest.fn(async () => []) },
  } as any;
}

describe('resolveMasterCategory', () => {
  it('returns the active master category', async () => {
    const db = makeDb();
    db.category.findFirst.mockResolvedValueOnce({
      id: 'c1',
      name: 'Cafes',
      slug: 'cafes',
      template: null,
    });
    await expect(resolveMasterCategory(db, 'cafes')).resolves.toMatchObject({ id: 'c1' });
  });

  it('follows a merge to the target so old drafts keep working', async () => {
    const db = makeDb();
    db.category.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      mergedInto: {
        id: 't1',
        name: 'Restaurants',
        slug: 'restaurants',
        template: 'RESTAURANT',
        isActive: true,
        deletedAt: null,
      },
    });
    await expect(resolveMasterCategory(db, 'cafes')).resolves.toMatchObject({
      slug: 'restaurants',
    });
  });

  it('refuses unknown, archived or merged-into-archived slugs instead of falling back', async () => {
    const db = makeDb();
    db.category.findFirst.mockResolvedValue(null);
    await expect(resolveMasterCategory(db, 'nope')).rejects.toBeInstanceOf(BadRequestException);

    const db2 = makeDb();
    db2.category.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      mergedInto: {
        id: 't1',
        name: 'X',
        slug: 'x',
        template: null,
        isActive: false,
        deletedAt: null,
      },
    });
    await expect(resolveMasterCategory(db2, 'cafes')).rejects.toThrow(/no longer available/);
  });
});

describe('resolveMasterSubcategories', () => {
  it('returns nothing without slugs and only queries the master tenant otherwise', async () => {
    const db = makeDb();
    await expect(resolveMasterSubcategories(db, [])).resolves.toEqual([]);
    expect(db.category.findMany).not.toHaveBeenCalled();
    await resolveMasterSubcategories(db, ['a']);
    expect(db.category.findMany.mock.calls[0][0].where).toMatchObject({
      slug: { in: ['a'] },
      isActive: true,
      deletedAt: null,
    });
  });
});

describe('planCategoryConsolidation', () => {
  const row = (id: string, tenantId: string, slug: string, over: any = {}) => ({
    id,
    tenantId,
    slug,
    name: slug,
    description: null,
    icon: null,
    sortOrder: 10,
    isActive: true,
    deletedAt: null,
    ...over,
  });

  it('maps referenced copies to the master row and retires unused ones', () => {
    const plan = planCategoryConsolidation({
      masterTenantId: 'M',
      categories: [row('m1', 'M', 'food'), row('a1', 'A', 'food'), row('b1', 'B', 'food')],
      referencedIds: new Set(['a1']),
    });
    expect(plan.rows.find((r) => r.categoryId === 'a1')).toMatchObject({
      action: 'MAP',
      masterId: 'm1',
    });
    expect(plan.rows.find((r) => r.categoryId === 'b1')).toMatchObject({ action: 'RETIRE_UNUSED' });
    expect(plan.blockers).toEqual([]);
  });

  it('creates a master row once for a copy-only slug that is still used', () => {
    const plan = planCategoryConsolidation({
      masterTenantId: 'M',
      categories: [row('a1', 'A', 'legacy'), row('b1', 'B', 'legacy')],
      referencedIds: new Set(['a1', 'b1']),
    });
    expect(plan.createMaster).toHaveLength(1);
    expect(plan.rows.every((r) => r.action === 'CREATE_MASTER')).toBe(true);
  });

  it('blocks when the master slug was deleted but a copy is still used', () => {
    const plan = planCategoryConsolidation({
      masterTenantId: 'M',
      categories: [row('m1', 'M', 'gone', { deletedAt: new Date() }), row('a1', 'A', 'gone')],
      referencedIds: new Set(['a1']),
    });
    expect(plan.blockers).toHaveLength(1);
    expect(plan.rows[0].action).toBe('BLOCKED');
  });

  it('ignores the master tenant and already-retired copies', () => {
    const plan = planCategoryConsolidation({
      masterTenantId: 'M',
      categories: [row('m1', 'M', 'food'), row('a1', 'A', 'food', { deletedAt: new Date() })],
      referencedIds: new Set(),
    });
    expect(plan.rows).toEqual([]);
  });
});

describe('remapIds', () => {
  it('rewrites ids through the map, drops duplicates, keeps order, ignores junk', () => {
    const map = new Map([
      ['a', 'M'],
      ['b', 'M'],
    ]);
    expect(remapIds(['a', 'x', 'b', 5, null], map)).toEqual(['M', 'x']);
    expect(remapIds('nope', map)).toEqual([]);
  });
});
