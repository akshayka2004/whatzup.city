import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  PUBLIC_CODE_ALPHABET,
  generatePublicCode,
  normalizePublicCode,
} from '../../common/utils/public-code';
import { BusinessesService } from './businesses.service';

describe('public code helpers', () => {
  it('makes 6 characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 500; i++) {
      const code = generatePublicCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(PUBLIC_CODE_ALPHABET).toContain(ch);
    }
    expect(PUBLIC_CODE_ALPHABET).not.toMatch(/[ILO01]/);
  });

  it('accepts lower case, rejects anything that cannot be a code', () => {
    expect(normalizePublicCode(' k7m3q9 ')).toBe('K7M3Q9');
    for (const bad of ['', 'abc', 'K7M3Q0', 'K7M3-Q9', 'K7M3Q9K7M3Q9K', null, 42, undefined]) {
      expect(normalizePublicCode(bad)).toBeNull();
    }
  });
});

function build(opts: { found?: { id: string } | null; cached?: string | null; owner?: any } = {}) {
  const model = {
    findFirst: jest.fn(async () => opts.found ?? null),
    updateMany: jest.fn(async () => ({ count: 1 })),
    findUnique: jest.fn(async () => ({ publicCode: 'EXIST1' })),
  };
  const repo: any = { model, findOne: jest.fn(async () => opts.owner ?? null) };
  const redis: any = {
    get: jest.fn(async () => opts.cached ?? null),
    set: jest.fn(async () => {}),
    del: jest.fn(async () => {}),
  };
  const svc = new BusinessesService(
    repo,
    {} as any,
    redis,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { svc, model, repo, redis };
}

describe('BusinessesService.findIdByPublicCode', () => {
  it('resolves an approved, live business and caches the answer', async () => {
    const { svc, model, redis } = build({ found: { id: 'b1' } });
    await expect(svc.findIdByPublicCode('k7m3q9')).resolves.toEqual({ id: 'b1' });
    expect(model.findFirst).toHaveBeenCalledWith({
      where: { publicCode: 'K7M3Q9', deletedAt: null, status: 'APPROVED' },
      select: { id: true },
    });
    expect(redis.set).toHaveBeenCalledWith('business-code:K7M3Q9', 'b1', 300);
  });

  it('serves a cached answer without touching the database', async () => {
    const { svc, model } = build({ cached: 'b9' });
    await expect(svc.findIdByPublicCode('K7M3Q9')).resolves.toEqual({ id: 'b9' });
    expect(model.findFirst).not.toHaveBeenCalled();
  });

  it('says not found for unknown codes and for junk without querying', async () => {
    const { svc, model } = build({ found: null });
    await expect(svc.findIdByPublicCode('K7M3Q9')).rejects.toBeInstanceOf(NotFoundException);
    model.findFirst.mockClear();
    await expect(svc.findIdByPublicCode('<script>')).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findFirst).not.toHaveBeenCalled();
  });
});

describe('BusinessesService.ensurePublicCode', () => {
  it('returns the code a business already has', async () => {
    const { svc, model } = build({ owner: { id: 'b1', ownerId: 'u1', publicCode: 'HAVE22' } });
    await expect(svc.ensurePublicCode('t', 'b1', { id: 'u1' })).resolves.toEqual({
      publicCode: 'HAVE22',
    });
    expect(model.updateMany).not.toHaveBeenCalled();
  });

  it('creates one for the owner, filling only an empty code', async () => {
    const { svc, model } = build({ owner: { id: 'b1', ownerId: 'u1', publicCode: null } });
    const out = await svc.ensurePublicCode('t', 'b1', { id: 'u1' });
    expect(out.publicCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(model.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', publicCode: null },
      data: { publicCode: out.publicCode },
    });
  });

  it('retries when the code clashes', async () => {
    const { svc, model } = build({ owner: { id: 'b1', ownerId: 'u1', publicCode: null } });
    model.updateMany.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    await expect(svc.ensurePublicCode('t', 'b1', { id: 'u1' })).resolves.toHaveProperty(
      'publicCode',
    );
    expect(model.updateMany).toHaveBeenCalledTimes(2);
  });

  it('keeps the winner when two requests race', async () => {
    const { svc, model } = build({ owner: { id: 'b1', ownerId: 'u1', publicCode: null } });
    model.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.ensurePublicCode('t', 'b1', { id: 'u1' })).resolves.toEqual({
      publicCode: 'EXIST1',
    });
  });

  it('refuses someone else and a missing business', async () => {
    const notOwner = build({ owner: { id: 'b1', ownerId: 'other', publicCode: null } });
    await expect(notOwner.svc.ensurePublicCode('t', 'b1', { id: 'u1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      build({ owner: null }).svc.ensurePublicCode('t', 'b1', { id: 'u1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets a super admin or portal admin create one for any business', async () => {
    for (const role of ['SUPER_ADMIN', 'MASTER_ADMIN']) {
      const { svc, model } = build({
        found: { id: 'b1', ownerId: 'someone-else', publicCode: null } as any,
      });
      const out = await svc.ensurePublicCode('other-tenant', 'b1', { id: 'admin', role });
      expect(out.publicCode).toMatch(/^[A-Z2-9]{6}$/);
      expect(model.updateMany).toHaveBeenCalled();
    }
    // Platform staff are not admins here.
    const staff = build({ owner: { id: 'b1', ownerId: 'other', publicCode: null } });
    await expect(
      staff.svc.ensurePublicCode('t', 'b1', { id: 'staff', role: 'PLATFORM_STAFF' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
