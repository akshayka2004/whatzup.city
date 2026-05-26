import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(data: {
    tenantId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldData?: any;
    newData?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<any> {
    return this.db.auditLog.create({ data });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 50,
    filters?: { userId?: string; action?: string; resource?: string },
    actorRole?: string,
  ): Promise<any> {
    const where: any = { tenantId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.db.auditLog.count({ where }),
    ]);

    let finalData = data;
    if (actorRole !== 'SUPER_ADMIN') {
      finalData = data.map((log: any) => {
        if (log.user) {
          const userCopy = { ...log.user };
          delete userCopy.email;
          delete userCopy.phone;
          return {
            ...log,
            user: userCopy,
          };
        }
        return log;
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
}
