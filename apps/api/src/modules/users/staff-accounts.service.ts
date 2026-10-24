// ============================================================
// Staff accounts — a super admin creates admin-portal accounts and decides, per account,
// which areas they may view or manage. Access itself is enforced by RolesGuard from the
// grants stored here (see packages/types/src/access.ts).
// ============================================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ACCESS_AREAS, effectiveGrants, normalizeGrants, type AccessGrants } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { PasswordService } from '../auth/password.service';

export type StaffRole = 'PLATFORM_STAFF' | 'MASTER_ADMIN';
const STAFF_ROLES: StaffRole[] = ['PLATFORM_STAFF', 'MASTER_ADMIN'];

const SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  grants: true,
  mustChangePassword: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

/** Row shape the web app uses: stored grants resolved to what the account really has. */
function present(row: { role: string; grants: unknown; [k: string]: any }) {
  return { ...row, grants: effectiveGrants(row.role, row.grants) };
}

@Injectable()
export class StaffAccountsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(tenantId: string) {
    const rows = await this.db.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        role: { in: ['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF'] },
      },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    });
    return rows.map(present);
  }

  async create(
    actor: { id: string; tenantId: string },
    data: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role: StaffRole;
      grants: unknown;
    },
  ) {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    if (!name || !email) throw new BadRequestException('Name and email are required.');
    if (!STAFF_ROLES.includes(data.role)) {
      throw new BadRequestException('Role must be PLATFORM_STAFF or MASTER_ADMIN.');
    }
    this.assertPassword(data.password);
    const grants = this.assertGrants(data.grants);

    const existing = await this.db.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const user = await this.db.user.create({
      data: {
        tenantId: actor.tenantId,
        email,
        name,
        phone: data.phone?.trim() || null,
        passwordHash: await this.passwordService.hash(data.password),
        role: data.role,
        grants: grants as any,
        isActive: true,
        emailVerified: true,
        // They must replace the temporary password the super admin chose.
        mustChangePassword: true,
        createdBy: actor.id,
      },
      select: SELECT,
    });

    await this.audit(actor, 'STAFF_CREATED', user.id, { email, role: data.role, grants });
    return present(user);
  }

  async update(
    actor: { id: string; tenantId: string },
    id: string,
    data: { name?: string; phone?: string; role?: StaffRole; grants?: unknown; isActive?: boolean },
  ) {
    const target = await this.findEditable(actor, id);

    const patch: Record<string, unknown> = { updatedBy: actor.id };
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new BadRequestException('Name cannot be empty.');
      patch.name = data.name.trim();
    }
    if (data.phone !== undefined) patch.phone = data.phone.trim() || null;
    if (data.role !== undefined) {
      if (!STAFF_ROLES.includes(data.role)) {
        throw new BadRequestException('Role must be PLATFORM_STAFF or MASTER_ADMIN.');
      }
      patch.role = data.role;
    }
    if (data.grants !== undefined) patch.grants = this.assertGrants(data.grants) as any;
    if (data.isActive !== undefined) {
      if (id === actor.id && data.isActive === false) {
        throw new BadRequestException('You cannot deactivate your own account.');
      }
      patch.isActive = data.isActive;
    }

    const updated = await this.db.user.update({ where: { id }, data: patch, select: SELECT });

    // Whatever changed, the next request must see it, and a deactivated person is signed out.
    await this.redis.del(`user:${id}`);
    await this.redis.del(`user-permissions:${id}`);
    if (data.isActive === false) await this.revokeSessions(id);

    await this.audit(
      actor,
      data.isActive === false
        ? 'STAFF_DEACTIVATED'
        : data.isActive === true && !target.isActive
          ? 'STAFF_REACTIVATED'
          : 'STAFF_UPDATED',
      id,
      {
        before: { role: target.role, grants: effectiveGrants(target.role, target.grants) },
        after: { role: updated.role, grants: effectiveGrants(updated.role, updated.grants) },
      },
    );
    return present(updated);
  }

  async resetPassword(actor: { id: string; tenantId: string }, id: string, password: string) {
    await this.findEditable(actor, id);
    this.assertPassword(password);

    await this.db.user.update({
      where: { id },
      data: {
        passwordHash: await this.passwordService.hash(password),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedBy: actor.id,
      },
    });
    await this.redis.del(`user:${id}`);
    await this.revokeSessions(id);
    await this.audit(actor, 'STAFF_PASSWORD_RESET', id, {});
    return { message: 'Password reset. They must choose a new one at next sign-in.' };
  }

  // ── helpers ────────────────────────────────────────────────────────────

  /** A staff or portal-admin account in this tenant. Super admins are never edited here. */
  private async findEditable(actor: { id: string; tenantId: string }, id: string) {
    const target = await this.db.user.findFirst({
      where: { id, tenantId: actor.tenantId, deletedAt: null },
      select: { id: true, role: true, grants: true, isActive: true },
    });
    if (!target) throw new NotFoundException('Account not found.');
    if (!STAFF_ROLES.includes(target.role as StaffRole)) {
      throw new BadRequestException('Only staff and portal admin accounts can be changed here.');
    }
    return target;
  }

  private assertPassword(password: unknown) {
    if (typeof password !== 'string' || !this.passwordService.isStrongPassword(password)) {
      throw new BadRequestException(
        'Temporary password needs 8+ characters with upper and lower case, a number and a symbol.',
      );
    }
  }

  /** Only known areas and levels get through, and an account must be able to do something. */
  private assertGrants(input: unknown): AccessGrants {
    const grants = normalizeGrants(input);
    if (Object.keys(grants).length === 0) {
      throw new BadRequestException(
        `Choose access for at least one area (${ACCESS_AREAS.map((a) => a.label).join(', ')}).`,
      );
    }
    return grants;
  }

  private async revokeSessions(userId: string) {
    await this.db.session.deleteMany({ where: { userId } });
    await this.db.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
  }

  private audit(
    actor: { id: string; tenantId: string },
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.db.auditLog
      .create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action,
          resource: 'users',
          resourceId,
          metadata: metadata as any,
        },
      })
      .catch(() => {});
  }
}
