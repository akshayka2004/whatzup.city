import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
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
    const user = await this.db.user.update({ where: { id }, data });
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

  async getReferralStats(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true } as any,
    });
    const referrals = await this.db.user.findMany({
      where: { referredBy: userId, deletedAt: null } as any,
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { referralCode: (user as any)?.referralCode, count: referrals.length, referrals };
  }

  async getReferralLeaderboard(tenantId: string) {
    // Group users by referredBy to get counts
    const result = await this.db.$queryRaw`
      SELECT u.id, u.name, u.email, u.referral_code as "referralCode",
             COUNT(r.id)::int as "referralCount"
      FROM users u
      LEFT JOIN users r ON r.referred_by = u.id AND r.deleted_at IS NULL
      WHERE u.tenant_id = ${tenantId}::uuid AND u.deleted_at IS NULL
      GROUP BY u.id, u.name, u.email, u.referral_code
      HAVING COUNT(r.id) > 0
      ORDER BY "referralCount" DESC
      LIMIT 50
    `;
    const total = await this.db.user.count({
      where: { tenantId, deletedAt: null, referredBy: { not: null } } as any,
    });
    return { leaderboard: result, totalReferredUsers: total };
  }
}
