import { HttpException, UnauthorizedException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { normalizeIndianMobile } from '../../common/utils/phone';

/** Tiny in-memory stand-in for RedisService (the real one has the same fallback behaviour). */
function fakeRedis() {
  const store = new Map<string, { v: unknown; exp?: number }>();
  const live = (k: string) => {
    const e = store.get(k);
    if (!e) return undefined;
    if (e.exp && e.exp < Date.now()) {
      store.delete(k);
      return undefined;
    }
    return e;
  };
  return {
    store,
    get: async (k: string) => (live(k)?.v ?? null) as any,
    set: async (k: string, v: unknown, ttl?: number) => {
      store.set(k, { v, exp: ttl ? Date.now() + ttl * 1000 : undefined });
    },
    del: async (k: string) => void store.delete(k),
    exists: async (k: string) => !!live(k),
    incr: async (k: string) => {
      const n = ((live(k)?.v as number) || 0) + 1;
      store.set(k, { v: n, exp: store.get(k)?.exp });
      return n;
    },
    expire: async (k: string, ttl: number) => {
      const e = store.get(k);
      if (e) e.exp = Date.now() + ttl * 1000;
    },
  };
}

function build(userIds: string[]) {
  const redis = fakeRedis();
  const sent: { phone: string; code: string }[] = [];
  const sms = {
    sendOtp: jest.fn(async (phone: string, code: string) => {
      sent.push({ phone, code });
    }),
  };
  const db = { $queryRaw: jest.fn(async () => userIds.map((id) => ({ id }))) };
  const config = { get: (_k: string, d?: string) => d };
  const svc = new OtpService(db as any, redis as any, sms as any, config as any);
  return { svc, redis, sms, sent, db };
}

const flush = () => new Promise((r) => setImmediate(r));

describe('normalizeIndianMobile', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+91 98765-43210', '9876543210'],
    ['09876543210', '9876543210'],
    ['919876543210', '9876543210'],
  ])('reads %s', (input, want) => expect(normalizeIndianMobile(input)).toBe(want));

  it.each(['12345', '5876543210', '98765432101', '', 'abc'])('rejects %s', (input) =>
    expect(normalizeIndianMobile(input)).toBeNull(),
  );
});

describe('OtpService', () => {
  it('rejects a malformed number', async () => {
    const { svc } = build(['u1']);
    await expect(svc.request('123')).rejects.toThrow('valid 10-digit');
  });

  it('sends a 6-digit code to a number on exactly one account, and verifies it once', async () => {
    const { svc, sent } = build(['u1']);
    await svc.request('98765 43210');
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].phone).toBe('9876543210');
    expect(sent[0].code).toMatch(/^\d{6}$/);

    await expect(svc.verify('9876543210', sent[0].code)).resolves.toBe('u1');
    // Used up.
    await expect(svc.verify('9876543210', sent[0].code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('answers the same for an unknown number but sends nothing', async () => {
    const known = build(['u1']);
    const unknown = build([]);
    const a = await known.svc.request('9876543210');
    const b = await unknown.svc.request('9876543210');
    await flush();
    expect(b).toEqual(a);
    expect(unknown.sent).toHaveLength(0);
  });

  it('sends nothing when the number is on two accounts', async () => {
    const { svc, sent } = build(['u1', 'u2']);
    await svc.request('9876543210');
    await flush();
    expect(sent).toHaveLength(0);
  });

  it('does not let the caller wait on or see an SMS failure', async () => {
    const { svc, sms } = build(['u1']);
    sms.sendOtp.mockRejectedValueOnce(new Error('provider down'));
    await expect(svc.request('9876543210')).resolves.toEqual({ resendIn: 30 });
  });

  it('enforces the resend cooldown for registered and unknown numbers alike', async () => {
    for (const ids of [['u1'], []]) {
      const { svc } = build(ids);
      await svc.request('9876543210');
      await expect(svc.request('9876543210')).rejects.toBeInstanceOf(HttpException);
    }
  });

  it('caps codes per number per hour', async () => {
    const { svc, redis } = build(['u1']);
    for (let i = 0; i < OtpService.MAX_CODES_PER_HOUR; i++) {
      await svc.request('9876543210');
      await redis.del('otp:cool:9876543210');
    }
    await expect(svc.request('9876543210')).rejects.toThrow('Too many codes');
  });

  it('burns the code after too many wrong guesses, even if the right one follows', async () => {
    const { svc, sent } = build(['u1']);
    await svc.request('9876543210');
    await flush();
    const right = sent[0].code;
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < OtpService.MAX_GUESSES; i++) {
      await expect(svc.verify('9876543210', wrong)).rejects.toBeInstanceOf(UnauthorizedException);
    }
    await expect(svc.verify('9876543210', right)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a code whose number moved to another account after it was sent', async () => {
    const { svc, sent, db } = build(['u1']);
    await svc.request('9876543210');
    await flush();
    db.$queryRaw.mockResolvedValueOnce([{ id: 'u2' }] as any);
    await expect(svc.verify('9876543210', sent[0].code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuses an expired code', async () => {
    const { svc, sent, redis } = build(['u1']);
    await svc.request('9876543210');
    await flush();
    const key = 'otp:code:9876543210';
    const entry: any = await redis.get(key);
    await redis.set(key, { ...entry, exp: Date.now() - 1 }, 60);
    await expect(svc.verify('9876543210', sent[0].code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a code that is not six digits without touching the store', async () => {
    const { svc } = build(['u1']);
    await expect(svc.verify('9876543210', '12ab56')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
