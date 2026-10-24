import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StaffAccountsService } from './staff-accounts.service';

const actor = { id: 'sa1', tenantId: 't1' };
const STRONG = 'Temp#Pass1';

function build(existing: Record<string, any> | null = null, emailTaken = false) {
  const db: any = {
    user: {
      findFirst: jest.fn(async (args: any) => {
        if (args.where?.email) return emailTaken ? { id: 'x' } : null;
        return existing;
      }),
      create: jest.fn(async ({ data }: any) => ({ id: 'new1', ...data, createdAt: new Date() })),
      update: jest.fn(async ({ data, where }: any) => ({
        id: where.id,
        role: existing?.role ?? 'PLATFORM_STAFF',
        grants: existing?.grants ?? null,
        isActive: true,
        ...data,
      })),
      findMany: jest.fn(async () => []),
    },
    session: { deleteMany: jest.fn(async () => ({})) },
    refreshToken: { updateMany: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  const redis: any = { del: jest.fn(async () => {}) };
  const passwords: any = {
    hash: jest.fn(async (p: string) => `hash:${p}`),
    isStrongPassword: (p: string) =>
      /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /\W/.test(p) && p.length >= 8,
  };
  return { svc: new StaffAccountsService(db, redis, passwords), db, redis };
}

const input = {
  name: ' Asha ',
  email: ' Asha@Example.com ',
  password: STRONG,
  role: 'PLATFORM_STAFF' as const,
  grants: { events: 'manage', bogus: 'manage', reports: 'none' },
};

describe('StaffAccountsService.create', () => {
  it('stores only valid grants, forces a password change, and audits', async () => {
    const { svc, db } = build();
    await svc.create(actor, input);
    const data = db.user.create.mock.calls[0][0].data;
    expect(data.email).toBe('asha@example.com');
    expect(data.name).toBe('Asha');
    expect(data.grants).toEqual({ events: 'manage' });
    expect(data.mustChangePassword).toBe(true);
    expect(data.passwordHash).toBe(`hash:${STRONG}`);
    expect(db.auditLog.create).toHaveBeenCalled();
  });

  it('refuses an account with nothing granted', async () => {
    const { svc } = build();
    await expect(svc.create(actor, { ...input, grants: { bogus: 'manage' } })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuses a weak temporary password', async () => {
    const { svc } = build();
    await expect(svc.create(actor, { ...input, password: 'password' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuses a duplicate email and a role that is not staff', async () => {
    await expect(build(null, true).svc.create(actor, input)).rejects.toThrow(ConflictException);
    await expect(
      build().svc.create(actor, { ...input, role: 'SUPER_ADMIN' as any }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('StaffAccountsService.update', () => {
  const staff = { id: 'u1', role: 'PLATFORM_STAFF', grants: { events: 'view' }, isActive: true };

  it('changes grants and clears the cached user so it takes effect at once', async () => {
    const { svc, db, redis } = build(staff);
    const out = await svc.update(actor, 'u1', { grants: { events: 'manage', notices: 'view' } });
    expect(db.user.update.mock.calls[0][0].data.grants).toEqual({
      events: 'manage',
      notices: 'view',
    });
    expect(redis.del).toHaveBeenCalledWith('user:u1');
    expect(out.grants).toEqual({ events: 'manage', notices: 'view' });
  });

  it('signs a deactivated person out everywhere', async () => {
    const { svc, db } = build(staff);
    await svc.update(actor, 'u1', { isActive: false });
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(db.refreshToken.updateMany).toHaveBeenCalled();
    expect(db.auditLog.create.mock.calls[0][0].data.action).toBe('STAFF_DEACTIVATED');
  });

  it('will not deactivate yourself, edit a super admin, or edit someone missing', async () => {
    await expect(
      build({ ...staff, id: 'sa1' }).svc.update(actor, 'sa1', { isActive: false }),
    ).rejects.toThrow('own account');
    await expect(
      build({ ...staff, role: 'SUPER_ADMIN' }).svc.update(actor, 'u1', { name: 'x' }),
    ).rejects.toThrow(BadRequestException);
    await expect(build(null).svc.update(actor, 'u1', { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('shows an old account with no stored grants as what its role allows', async () => {
    const { svc } = build({ ...staff, grants: null });
    const out = await svc.update(actor, 'u1', { name: 'New name' });
    expect(out.grants).toMatchObject({ events: 'manage', businesses: 'view' });
  });
});

describe('StaffAccountsService.resetPassword', () => {
  it('sets a temporary password, clears any lock, forces a change and revokes sessions', async () => {
    const { svc, db } = build({ id: 'u1', role: 'MASTER_ADMIN', grants: null, isActive: true });
    await svc.resetPassword(actor, 'u1', STRONG);
    const data = db.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      mustChangePassword: true,
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
    expect(db.session.deleteMany).toHaveBeenCalled();
    await expect(svc.resetPassword(actor, 'u1', 'weak')).rejects.toThrow(BadRequestException);
  });
});
