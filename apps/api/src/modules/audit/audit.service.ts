import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Fire-and-forget. Audit is a best-effort side-effect and must never add a
   * network round-trip to (or fail) the user's request. Callers may still
   * `await` this — it resolves immediately; the INSERT runs in the background
   * and only logs on failure. This removes one remote-DB round-trip from every
   * create / update / delete.
   */
  log(data: {
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
  }): void {
    void this.db.auditLog
      .create({ data })
      .catch((e) => this.logger.warn(`audit log failed (${data.action}): ${e?.message ?? e}`));
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
