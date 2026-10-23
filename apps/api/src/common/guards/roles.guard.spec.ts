import { RolesGuard, roleSatisfies } from './roles.guard';

describe('roleSatisfies', () => {
  it('ranks business roles among themselves', () => {
    expect(roleSatisfies('BUSINESS_OWNER', 'BUSINESS_MODERATOR')).toBe(true);
    expect(roleSatisfies('BUSINESS_STAFF', 'BUSINESS_OWNER')).toBe(false);
  });

  it('does not let government, civic or specialty roles pass business routes', () => {
    for (const r of [
      'GOVERNMENT_ADMIN',
      'NGO_ADMIN',
      'INFLUENCER',
      'EVENT_ORGANIZER',
      'PLATFORM_STAFF',
    ])
      expect(roleSatisfies(r, 'BUSINESS_OWNER')).toBe(false);
  });

  it('lets platform admins through non-platform routes, ranked among themselves', () => {
    expect(roleSatisfies('MASTER_ADMIN', 'BUSINESS_OWNER')).toBe(true);
    expect(roleSatisfies('MASTER_ADMIN', 'GOVERNMENT_ADMIN')).toBe(true);
    expect(roleSatisfies('SUPER_ADMIN', 'MASTER_ADMIN')).toBe(true);
    expect(roleSatisfies('MASTER_ADMIN', 'SUPER_ADMIN')).toBe(false);
  });

  it('treats USER as any signed-in account and needs exact matches elsewhere', () => {
    expect(roleSatisfies('INFLUENCER', 'USER')).toBe(true);
    expect(roleSatisfies('GOVERNMENT_ADMIN', 'MASTER_ADMIN')).toBe(false);
    expect(roleSatisfies('PLATFORM_STAFF', 'PLATFORM_STAFF')).toBe(true);
  });
});

describe('RolesGuard two-factor enforcement', () => {
  const guardFor = (user: Record<string, unknown>) => {
    const reflector = { getAllAndOverride: () => ['SUPER_ADMIN'] } as any;
    const ctx = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any;
    return () => new RolesGuard(reflector).canActivate(ctx);
  };

  afterEach(() => {
    delete process.env.ADMIN_2FA_REQUIRED;
  });

  it('lets admins through when enforcement is off', () => {
    expect(guardFor({ role: 'SUPER_ADMIN', twoFactorEnabled: false })()).toBe(true);
  });

  it('blocks admins without 2FA when ADMIN_2FA_REQUIRED=true', () => {
    process.env.ADMIN_2FA_REQUIRED = 'true';
    expect(guardFor({ role: 'SUPER_ADMIN', twoFactorEnabled: false })).toThrow(
      'Turn on two-factor sign-in',
    );
    expect(guardFor({ role: 'SUPER_ADMIN', twoFactorEnabled: true })()).toBe(true);
  });
});
