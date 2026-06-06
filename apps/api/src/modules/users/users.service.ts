import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { PasswordService } from '../auth/password.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly passwordService: PasswordService,
  ) {}

  async findById(id: string, requesterId?: string, requesterRole?: string) {
    const cached = await this.redis.get(`user:${id}`);
    let user = cached;

    if (!user) {
      user = await this.db.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          tenantId: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!user) throw new NotFoundException('User not found');
      await this.redis.set(`user:${id}`, user, 300);
    }

    if (requesterId !== undefined || requesterRole !== undefined) {
      const isSelf = requesterId === id;
      const isSuperAdmin = requesterRole === 'SUPER_ADMIN';
      if (!isSelf && !isSuperAdmin) {
        const userCopy = { ...user } as any;
        delete userCopy.email;
        delete userCopy.phone;
        return userCopy;
      }
    }

    return user;
  }

  async findByEmail(tenantId: string, email: string) {
    return this.db.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
  }

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; role?: string },
    requesterRole?: string,
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, deletedAt: null };
    if (params.role) where.role = params.role;

    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.db.user.count({ where }),
    ]);

    let finalData = data;
    if (requesterRole !== 'SUPER_ADMIN') {
      finalData = data.map((u) => {
        const uCopy = { ...u } as any;
        delete uCopy.email;
        delete uCopy.phone;
        return uCopy;
      });
    }

    return {
      data: finalData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async update(id: string, data: { name?: string; phone?: string; avatar?: string }) {
    const updateData = { ...data };
    if (updateData.avatar && !updateData.avatar.trim().startsWith('{')) {
      updateData.avatar = JSON.stringify({ bucket: 'profile-media', path: updateData.avatar });
    }
    const user = await this.db.user.update({ where: { id }, data: updateData });
    await this.redis.del(`user:${id}`);
    return user;
  }

  async softDelete(id: string) {
    await this.db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.redis.del(`user:${id}`);
  }

  /** Self-service account deletion — soft-deletes user + deactivates entities */
  async deleteSelf(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, tenantId: true },
    });
    if (!user) throw new Error('User not found');

    const now = new Date();
    await this.db.$transaction([
      this.db.user.update({ where: { id: userId }, data: { deletedAt: now, isActive: false } }),
      this.db.entity.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt: now } }),
      this.db.session.deleteMany({ where: { userId } }),
      this.db.refreshToken.deleteMany({ where: { userId } }),
    ]);
    await this.redis.del(`user:${userId}`);
  }

  async findAllRegistrations(params: {
    tenantId?: string;
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Number(params.limit) || 30, 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          referralCode: true,
          acceptedTermsAt: true,
          acceptedPrivacyAt: true,
          createdAt: true,
          lastLoginAt: true,
          tenant: { select: { name: true, slug: true } },
          businesses: {
            where: { deletedAt: null },
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              status: true,
              city: true,
              state: true,
              phone: true,
              email: true,
              address: true,
              district: true,
              category: { select: { name: true, slug: true } },
              createdAt: true,
            },
          },
          customerProfile: {
            select: {
              status: true,
              city: true,
              district: true,
              state: true,
            },
          },
        },
      }),
      this.db.user.count({ where }),
    ]);

    return {
      data: data.map((u: any) => ({
        ...u,
        business: u.businesses?.[0] ?? null,
        businesses: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getReferralStats(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    const referrals = await this.db.user.findMany({
      where: { referredBy: userId, deletedAt: null },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { referralCode: user?.referralCode ?? null, count: referrals.length, referrals };
  }

  // Platform-wide referral leaderboard. Intentionally GLOBAL (not tenant-scoped):
  // each business signup creates its own tenant, so referrers and referred users
  // span tenants. Tenant scoping here undercounts. Used by the super-admin panel.
  async getReferralLeaderboard(_tenantId?: string) {
    const cacheKey = `referral:leaderboard:global`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const [result, total] = await Promise.all([
      // Referral leaderboard — uses @@index([referredBy]) for the self-join
      this.db.$queryRaw`
        SELECT u.id, u.name, u.email, u.referral_code as "referralCode",
               COUNT(r.id)::int as "referralCount"
        FROM users u
        LEFT JOIN users r ON r.referred_by = u.id AND r.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
        GROUP BY u.id, u.name, u.email, u.referral_code
        HAVING COUNT(r.id) > 0
        ORDER BY "referralCount" DESC
        LIMIT 50
      `,
      this.db.user.count({
        where: { deletedAt: null, referredBy: { not: null } },
      }),
    ]);

    const data = { leaderboard: result, totalReferredUsers: total };
    await this.redis.set(cacheKey, data, 60); // 60s cache — fast reflection of new referrals
    return data;
  }

  /**
   * Authenticated user changes their own password.
   */
  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    if (!data.currentPassword || !data.newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }
    if (data.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const user = await this.db.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const matches = await this.passwordService.compare(data.currentPassword, user.passwordHash);
    if (!matches) throw new BadRequestException('Current password is incorrect');

    const newHash = await this.passwordService.hash(data.newPassword);
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.redis.del(`user:${userId}`);
    return { message: 'Password updated successfully' };
  }

  /**
   * Super Admin creates a Portal Admin / Master Admin account.
   * The new admin can log in immediately (emailVerified: true, isActive: true).
   */
  async createAdminUser(
    tenantId: string,
    data: { name: string; email: string; password: string; role: 'MASTER_ADMIN' | 'PORTAL_ADMIN' },
  ) {
    if (!data.name || !data.email || !data.password) {
      throw new BadRequestException('Name, email and password are required');
    }
    if (data.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const validRoles = ['MASTER_ADMIN', 'PORTAL_ADMIN'];
    if (!validRoles.includes(data.role)) {
      throw new BadRequestException('Invalid role — must be MASTER_ADMIN or PORTAL_ADMIN');
    }

    const emailNormalized = data.email.trim().toLowerCase();
    const existing = await this.db.user.findFirst({ where: { email: emailNormalized, deletedAt: null } });
    if (existing) throw new ConflictException(`User with email "${emailNormalized}" already exists`);

    const passwordHash = await this.passwordService.hash(data.password);

    // PORTAL_ADMIN maps to MASTER_ADMIN in the DB enum (they differ only in UX label)
    const dbRole = data.role === 'PORTAL_ADMIN' ? 'MASTER_ADMIN' : data.role;

    const user = await this.db.user.create({
      data: {
        tenantId,
        email: emailNormalized,
        passwordHash,
        name: data.name.trim(),
        role: dbRole as any,
        isActive: true,
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        isActive: true,
      },
    });

    return user;
  }

  /**
   * List admin users (MASTER_ADMIN / SUPER_ADMIN) for the Super Admin panel.
   */
  async listAdminUsers(tenantId?: string) {
    const where: any = {
      deletedAt: null,
      role: { in: ['MASTER_ADMIN', 'SUPER_ADMIN'] },
    };
    if (tenantId) where.tenantId = tenantId;

    return this.db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }
}
