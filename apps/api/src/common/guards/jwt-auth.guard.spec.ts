import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

function ctx(req: Record<string, any>, type = 'http'): ExecutionContext {
  return {
    getType: () => type,
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard as a global guard', () => {
  const parent = AuthGuard('jwt').prototype;
  let verify: jest.SpyInstance;

  beforeEach(() => {
    verify = jest.spyOn(parent, 'canActivate').mockReturnValue(true as any);
  });
  afterEach(() => jest.restoreAllMocks());

  const guard = (isPublic: boolean) => {
    const reflector = { getAllAndOverride: jest.fn(() => isPublic) } as unknown as Reflector;
    return new JwtAuthGuard(reflector);
  };

  it('lets @Public() routes through without checking a token', () => {
    expect(guard(true).canActivate(ctx({}))).toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('checks the token on every route that is not @Public()', () => {
    guard(false).canActivate(ctx({}));
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('does not verify twice when a controller also names the guard', () => {
    expect(guard(false).canActivate(ctx({ user: { id: 'u1' } }))).toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('leaves sockets and other non-http contexts alone', () => {
    expect(guard(false).canActivate(ctx({}, 'ws'))).toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });
});
