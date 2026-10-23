import { ForbiddenException } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';

const ctx = (headers: Record<string, string> = {}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers, socket: { remoteAddress: '127.0.0.1' } }),
    }),
  }) as any;

describe('TurnstileGuard', () => {
  const fetchMock = jest.fn();
  const guard = new TurnstileGuard();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    process.env.TURNSTILE_SECRET_KEY = 'secret';
  });

  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it('is a no-op when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a request without a token', async () => {
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts a token Cloudflare confirms', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await expect(guard.canActivate(ctx({ 'cf-turnstile-response': 'tok' }))).resolves.toBe(true);
  });

  it('refuses a token Cloudflare rejects', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    await expect(guard.canActivate(ctx({ 'cf-turnstile-response': 'bad' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets the request through when Cloudflare is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(guard.canActivate(ctx({ 'cf-turnstile-response': 'tok' }))).resolves.toBe(true);
  });
});
