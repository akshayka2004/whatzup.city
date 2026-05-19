import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, agencyId: string, data: any) {
    return this.db.announcement.create({ data: { tenantId, agencyId, ...data } });
  }

  async findPublished(tenantId: string, page = 1, limit = 20) {
    const now = new Date();
    const where = {
      tenantId,
      isPublished: true,
      deletedAt: null,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    };
    const [data, total] = await Promise.all([
      this.db.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.db.announcement.count({ where }),
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
    const ann = await this.db.announcement.findUnique({ where: { id, deletedAt: null } });
    if (!ann) throw new NotFoundException('Announcement not found');
    await this.db.announcement.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return ann;
  }

  async update(id: string, data: any) {
    return this.db.announcement.update({ where: { id }, data });
  }
  async publish(id: string) {
    return this.db.announcement.update({
      where: { id },
      data: { isPublished: true, publishAt: new Date() },
    });
  }
}
