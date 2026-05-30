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
      data: await this.attachPublishers(data),
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
    const [enriched] = await this.attachPublishers([ann]);
    return enriched;
  }

  /**
   * Attach each announcement's publishing civic organisation profile —
   * social media links, logo, org name — so the public notice card can
   * render clickable social buttons. agencyId = publishing user id.
   */
  private async attachPublishers(announcements: any[]): Promise<any[]> {
    if (!announcements?.length) return announcements;
    const agencyIds = Array.from(
      new Set(announcements.map((a) => a.agencyId).filter(Boolean)),
    );
    if (!agencyIds.length) return announcements;

    const entities = await (this.db as any).entity.findMany({
      where: { userId: { in: agencyIds }, deletedAt: null },
      include: { civicProfile: true },
    });

    const byUser = new Map<string, any>();
    for (const e of entities) {
      if (e.civicProfile) byUser.set(e.userId, e);
    }

    return announcements.map((a) => {
      const entity = byUser.get(a.agencyId);
      const profile = entity?.civicProfile;
      const socialLinks = Array.isArray(profile?.socialLinks)
        ? profile.socialLinks.filter((l: any) => l && l.label && l.url)
        : [];
      return {
        ...a,
        socialLinks,
        publisher: profile
          ? {
              organizationName: profile.organizationName,
              organizationType: profile.organizationType,
              logoUrl: profile.logoUrl ?? null,
            }
          : null,
      };
    });
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
