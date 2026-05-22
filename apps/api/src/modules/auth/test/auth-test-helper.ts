import { UserRoleEnum } from '@prisma/client';
import { AuthUser } from '../interfaces/auth-user.interface';
import { JwtPayload } from '../auth.service';

/**
 * Creates a mock AuthUser object for route testing / mock injection
 */
export const createMockAuthUser = (overrides?: Partial<AuthUser>): AuthUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'mockuser@example.com',
  name: 'Mock User',
  role: UserRoleEnum.USER,
  tenantId: '00000000-0000-0000-0000-000000000000',
  permissions: [],
  ...overrides,
});

/**
 * Creates a mock JwtPayload object matching JWT payload signatures
 */
export const createMockJwtPayload = (overrides?: Partial<JwtPayload>): JwtPayload => ({
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'mockuser@example.com',
  role: UserRoleEnum.USER,
  tenantId: '00000000-0000-0000-0000-000000000000',
  tokenId: 'mock-session-id-123',
  ...overrides,
});
