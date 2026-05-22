import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService, NotificationPriority } from '../notifications/notifications.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('campaign-queue') private readonly campaignQueue: Queue,
  ) {}

  async create(
    tenantId: string,
    adminId: string,
    data: {
      title: string;
      body: string;
      targetAudience?: any; // { city?: string; categoryId?: string }
      scheduledAt?: string;
    },
  ) {
    // Store as a GovernmentAnnouncement-like record or a custom campaign table
    // For MVP, we repurpose the notification system directly
    const campaign = await this.db.governmentAnnouncement.create({
      data: {
        tenantId,
        agencyId: adminId,
        title: data.title,
        body: data.body,
        category: 'CAMPAIGN',
        priority: 'NORMAL',
        isPublished: !data.scheduledAt,
        publishAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        targetAudience: data.targetAudience || {},
      },
    });

    await this.auditService.log({
      tenantId,
      userId: adminId,
      action: 'CREATE_CAMPAIGN',
      resource: 'CAMPAIGN',
      resourceId: campaign.id,
      newData: campaign,
    });

    if (!data.scheduledAt) {
      // Publish immediately
      await this.campaignQueue.add('deliver-campaign', {
        tenantId,
        campaignId: campaign.id,
        title: data.title,
        body: data.body,
        targetAudience: data.targetAudience,
      });
    } else {
      // Schedule delivery
      const delay = new Date(data.scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        await this.campaignQueue.add(
          'deliver-campaign',
          {
            tenantId,
            campaignId: campaign.id,
            title: data.title,
            body: data.body,
            targetAudience: data.targetAudience,
          },
          { delay },
        );
      }
    }

    return campaign;
  }

  async listCampaigns(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.db.governmentAnnouncement.findMany({
        where: { tenantId, category: 'CAMPAIGN', deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.governmentAnnouncement.count({
        where: { tenantId, category: 'CAMPAIGN', deletedAt: null },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCampaignAnalytics(tenantId: string, campaignId: string) {
    const campaign = await this.db.governmentAnnouncement.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Count notifications created for this campaign
    const delivered = await this.db.notification.count({
      where: { tenantId, type: 'CAMPAIGN', metadata: { path: ['campaignId'], equals: campaignId } },
    });

    const read = await this.db.notification.count({
      where: {
        tenantId,
        type: 'CAMPAIGN',
        isRead: true,
        metadata: { path: ['campaignId'], equals: campaignId },
      },
    });

    return {
      campaign,
      analytics: {
        totalDelivered: delivered,
        totalRead: read,
        openRate: delivered > 0 ? Math.round((read / delivered) * 10000) / 100 : 0,
      },
    };
  }
}
