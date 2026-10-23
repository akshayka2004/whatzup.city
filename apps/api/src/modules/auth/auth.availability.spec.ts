import { HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';

function build(opts: { user?: boolean; business?: boolean; customer?: boolean } = {}) {
  let hits = 0;
  const found = (yes?: boolean) => jest.fn(async () => (yes ? { id: 'x' } : null));
  const db = {
    user: { findFirst: found(opts.user) },
    business: { findFirst: found(opts.business) },
    customer: { findFirst: found(opts.customer) },
    tenant: { findFirst: jest.fn(async () => ({ id: 't1' })) },
  };
  const redis = {
    incr: jest.fn(async () => ++hits),
    expire: jest.fn(async () => {}),
  };
  const svc = new AuthService(db as any, {} as any, {} as any, redis as any, {} as any, {} as any);
  return { svc, db, redis };
}

describe('AuthService.checkAvailability', () => {
  it('reports a taken email, ignoring case and spaces', async () => {
    const { svc, db } = build({ user: true });
    await expect(
      svc.checkAvailability({ email: ' Owner@Example.com ', kind: 'BUSINESS' }),
    ).resolves.toEqual({ emailTaken: true });
    expect(db.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'owner@example.com', deletedAt: null } }),
    );
  });

  it('reports a free email and phone', async () => {
    const { svc } = build();
    await expect(
      svc.checkAvailability({ email: 'new@example.com', phone: '9876543210', kind: 'BUSINESS' }),
    ).resolves.toEqual({ emailTaken: false, phoneTaken: false });
  });

  it('business phone: taken by a user or by a business', async () => {
    await expect(
      build({ user: true }).svc.checkAvailability({ phone: '9876543210', kind: 'BUSINESS' }),
    ).resolves.toEqual({ phoneTaken: true });
    await expect(
      build({ business: true }).svc.checkAvailability({ phone: '9876543210', kind: 'BUSINESS' }),
    ).resolves.toEqual({ phoneTaken: true });
  });

  it('customer phone: checks customers only', async () => {
    const { svc, db } = build({ customer: true, user: true, business: true });
    await expect(svc.checkAvailability({ phone: '9876543210', kind: 'CUSTOMER' })).resolves.toEqual(
      { phoneTaken: true },
    );
    expect(db.business.findFirst).not.toHaveBeenCalled();
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it('government/NGO phone: never reported taken, as sign-up does not check it', async () => {
    const { svc } = build({ customer: true, user: true, business: true });
    await expect(svc.checkAvailability({ phone: '9876543210', kind: 'OTHER' })).resolves.toEqual({
      phoneTaken: false,
    });
  });

  it('only answers for the fields it was given', async () => {
    const { svc, db } = build({ user: true });
    await expect(svc.checkAvailability({ kind: 'BUSINESS' })).resolves.toEqual({});
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it('rate limits per IP', async () => {
    const { svc } = build();
    for (let i = 0; i < 60; i++)
      await svc.checkAvailability({ email: 'a@b.co', kind: 'OTHER' }, '1.2.3.4');
    await expect(
      svc.checkAvailability({ email: 'a@b.co', kind: 'OTHER' }, '1.2.3.4'),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
