import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { NotificationsService, NotificationPriority } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Processor('campaign-queue')
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, campaignId, title, body, targetAudience } = job.data;
    this.logger.log(`Processing campaign delivery: ${campaignId}`);

    try {
      // Build audience query
      const userWhere: any = { tenantId, deletedAt: null };

      // Bounded: fetch at most 1000 users per campaign for MVP
      const users = await this.db.user.findMany({
        where: userWhere,
        select: { id: true },
        take: 1000,
      });

      this.logger.log(`Delivering campaign to ${users.length} users`);

      // Send in batches of 50
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.all(
          batch.map((user) =>
            this.notificationsService.send({
              tenantId,
              userId: user.id,
              title,
              body,
              type: 'CAMPAIGN',
              priority: NotificationPriority.NORMAL,
              metadata: { campaignId },
            }),
          ),
        );
      }

      // Broadcast via WebSocket to all online tenant users
      this.realtimeGateway.broadcastToTenant(tenantId, 'campaign:new', {
        campaignId,
        title,
        body,
      });

      // Mark campaign as published
      await this.db.governmentAnnouncement.update({
        where: { id: campaignId },
        data: { isPublished: true },
      });

      return { delivered: users.length };
    } catch (error) {
      this.logger.error(`Campaign delivery failed: ${error.message}`);
      throw error;
    }
  }
}
