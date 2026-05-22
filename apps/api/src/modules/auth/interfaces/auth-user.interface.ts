import { UserRoleEnum } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleEnum;
  tenantId: string;
  permissions: string[];
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUser {}
  }
}
