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
}
