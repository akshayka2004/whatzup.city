import { UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { base32Decode, hotp, totpStep } from '../../common/utils/totp';

function fakeRedis() {
  const kv = new Map<string, unknown>();
  const counters = new Map<string, number>();
  return {
    set: jest.fn(async (k: string, v: unknown) => void kv.set(k, v)),
    get: jest.fn(async (k: string) => (kv.get(k) as any) ?? null),
    del: jest.fn(async (k: string) => void kv.delete(k)),
    incr: jest.fn(async (k: string) => {
      const n = (counters.get(k) ?? 0) + 1;
      counters.set(k, n);
      return n;
    }),
    expire: jest.fn(async () => undefined),
  };
}

// Identity "encryption" keeps the test about 2FA logic, not crypto.
const crypto = { encrypt: (v: string) => v, decrypt: (v: string | null) => v };

function setup() {
  const user: any = {
    id: 'u1',
    email: 'admin@example.test',
    role: 'SUPER_ADMIN',
    passwordHash: 'hash',
    twoFactorSecret: null,
    twoFactorEnabledAt: null,
    twoFactorRecoveryCodes: [],
  };
  const db = {
    user: {
      findFirst: jest.fn(async () => ({ ...user })),
      update: jest.fn(async ({ data }: any) => Object.assign(user, data)),
    },
  };
  const redis = fakeRedis();
  const password = { compare: jest.fn(async (p: string) => p === 'right') };
  const svc = new TwoFactorService(db as any, redis as any, crypto as any, password as any);
  return { svc, user, redis };
}

const codeFor = (secret: string, offsetSteps = 0) =>
  hotp(base32Decode(secret), totpStep() + offsetSteps);

describe('TwoFactorService', () => {
  afterEach(() => {
    delete process.env.ADMIN_2FA_REQUIRED;
  });

  it('enables with a valid code and returns ten recovery codes', async () => {
    const { svc, user } = setup();
    const { secret } = await svc.setup('u1');
    const { recoveryCodes } = await svc.enable('u1', codeFor(secret));
    expect(user.twoFactorEnabledAt).toBeInstanceOf(Date);
    expect(recoveryCodes).toHaveLength(10);
    expect(user.twoFactorRecoveryCodes).toHaveLength(10);
    expect(user.twoFactorRecoveryCodes[0]).not.toBe(recoveryCodes[0]); // stored hashed
  });

  it('rejects a replayed code within the same time step', async () => {
    const { svc } = setup();
    const { secret } = await svc.setup('u1');
    const code = codeFor(secret);
    await svc.enable('u1', code);
    const token = await svc.createChallenge('u1');
    await expect(svc.redeemChallenge(token, code)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('redeems a challenge once with a fresh code', async () => {
    const { svc } = setup();
    const { secret } = await svc.setup('u1');
    await svc.enable('u1', codeFor(secret, -1));
    const token = await svc.createChallenge('u1');
    await expect(svc.redeemChallenge(token, codeFor(secret))).resolves.toBe('u1');
    await expect(svc.redeemChallenge(token, codeFor(secret, 1))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts each recovery code once', async () => {
    const { svc, user } = setup();
    const { secret } = await svc.setup('u1');
    const { recoveryCodes } = await svc.enable('u1', codeFor(secret));
    const t1 = await svc.createChallenge('u1');
    await expect(svc.redeemChallenge(t1, recoveryCodes[0].toLowerCase())).resolves.toBe('u1');
    expect(user.twoFactorRecoveryCodes).toHaveLength(9);
    const t2 = await svc.createChallenge('u1');
    await expect(svc.redeemChallenge(t2, recoveryCodes[0])).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('locks a challenge after five wrong codes', async () => {
    const { svc } = setup();
    const { secret } = await svc.setup('u1');
    await svc.enable('u1', codeFor(secret));
    const token = await svc.createChallenge('u1');
    for (let i = 0; i < 5; i++) {
      await expect(svc.redeemChallenge(token, '000000')).rejects.toBeDefined();
    }
    await expect(svc.redeemChallenge(token, codeFor(secret, 1))).rejects.toMatchObject({
      status: 429,
    });
  });

  it('refuses to disable when 2FA is required for the role', async () => {
    process.env.ADMIN_2FA_REQUIRED = 'true';
    const { svc } = setup();
    const { secret } = await svc.setup('u1');
    await svc.enable('u1', codeFor(secret, -1));
    await expect(svc.disable('u1', 'right', codeFor(secret))).rejects.toThrow(/required/);
  });

  it('needs both password and code to disable', async () => {
    const { svc, user } = setup();
    const { secret } = await svc.setup('u1');
    await svc.enable('u1', codeFor(secret, -1));
    await expect(svc.disable('u1', 'wrong', codeFor(secret))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await svc.disable('u1', 'right', codeFor(secret, 1));
    expect(user.twoFactorEnabledAt).toBeNull();
  });
});
