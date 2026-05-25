import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  async create(tenantId: string, agencyId: string, data: any) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    return this.db.governmentAnnouncement.create({ data: { tenantId, agencyId, ...data } });
  }

  async findPublished(tenantId: string, page = 1, limit = 20) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const now = new Date();
    const where = {
      tenantId,
      isPublished: true,
      deletedAt: null,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    };
    const [data, total] = await Promise.all([
      this.db.governmentAnnouncement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.db.governmentAnnouncement.count({ where }),
    ]);
    return {
      data,
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

  async findById(id: string) {
    const ann = await this.db.governmentAnnouncement.findUnique({ where: { id, deletedAt: null } });
    if (!ann) throw new NotFoundException('Announcement not found');
    await this.db.governmentAnnouncement.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return ann;
  }

  async update(id: string, data: any) {
    return this.db.governmentAnnouncement.update({ where: { id }, data });
  }
  async publish(id: string) {
    return this.db.governmentAnnouncement.update({
      where: { id },
      data: { isPublished: true, publishAt: new Date() },
    });
  }
}
