import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService, NotificationPriority } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GovernmentAlertsService {
  private readonly logger = new Logger(GovernmentAlertsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    adminId: string,
    data: {
      title: string;
      body: string;
      category: string;
      priority: string;
      publishAt?: string;
      expiresAt?: string;
      targetAudience?: any;
      targetCities?: string[];
    },
  ) {
    const alert = await this.db.governmentAnnouncement.create({
      data: {
        tenantId,
        agencyId: adminId,
        title: data.title,
        body: data.body,
        category: data.category,
        priority: data.priority || 'MEDIUM',
        isPublished: !data.publishAt,
        publishAt: data.publishAt ? new Date(data.publishAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        targetAudience: data.targetAudience || {},
        targetCities: Array.isArray(data.targetCities) ? data.targetCities : [],
      },
    });

    await this.auditService.log({
      tenantId,
      userId: adminId,
      action: 'CREATE_GOVERNMENT_ALERT',
      resource: 'GOVERNMENT_ANNOUNCEMENT',
      resourceId: alert.id,
      newData: alert,
    });

    // If published immediately and CRITICAL, broadcast in real-time
    if (!data.publishAt && (data.priority === 'CRITICAL' || data.priority === 'HIGH')) {
      this.realtimeGateway.broadcastToTenant(tenantId, 'alert:emergency', {
        id: alert.id,
        title: data.title,
        body: data.body,
        priority: data.priority,
        category: data.category,
      });

      // Also push to all users
      const users = await this.db.user.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true },
        take: 5000,
      });

      const priority =
        data.priority === 'CRITICAL' ? NotificationPriority.CRITICAL : NotificationPriority.HIGH;

      // Fire-and-forget bulk send
      this.notificationsService
        .sendBulk({
          tenantId,
          userIds: users.map((u) => u.id),
          title: `⚠️ ${data.title}`,
          body: data.body,
          type: 'GOVERNMENT_ALERT',
          priority,
          metadata: { alertId: alert.id, category: data.category },
        })
        .catch((err) => this.logger.error('Bulk alert send failed', err));
    }

    // Invalidate cached alerts
    await this.redis.del(`gov-alerts:${tenantId}`);

    return alert;
  }

  async getPublished(tenantId: string, page = 1, limit = 20) {
    const cacheKey = `gov-alerts:${tenantId}:${page}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const [data, total] = await Promise.all([
      this.db.governmentAnnouncement.findMany({
        where: {
          tenantId,
          isPublished: true,
          category: { not: 'CAMPAIGN' },
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.db.governmentAnnouncement.count({
        where: {
          tenantId,
          isPublished: true,
          category: { not: 'CAMPAIGN' },
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
      }),
    ]);

    const result = {
      data: await this.attachPublishers(data),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    await this.redis.set(cacheKey, result, 600);
    return result;
  }

  /** Attach publishing civic org social links + logo to each alert. */
  private async attachPublishers(alerts: any[]): Promise<any[]> {
    if (!alerts?.length) return alerts;
    const agencyIds = Array.from(new Set(alerts.map((a) => a.agencyId).filter(Boolean)));
    if (!agencyIds.length) return alerts;

    const entities = await (this.db as any).entity.findMany({
      where: { userId: { in: agencyIds }, deletedAt: null },
      include: { civicProfile: true },
    });
    const byUser = new Map<string, any>();
    for (const e of entities) {
      if (e.civicProfile) byUser.set(e.userId, e);
    }

    return alerts.map((a) => {
      const profile = byUser.get(a.agencyId)?.civicProfile;
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

  async incrementViewCount(tenantId: string, id: string) {
    await this.db.governmentAnnouncement.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
}
