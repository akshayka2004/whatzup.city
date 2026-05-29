import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('trial-queue')
export class TrialNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(TrialNotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'send-trial-notification') return;

    const { tenantId, ownerId, title, body } = job.data as {
      tenantId: string;
      businessId: string;
      ownerId: string;
      title: string;
      body: string;
    };

    try {
      await this.notificationsService.send({
        tenantId,
        userId: ownerId,
        title,
        body,
        type: 'SYSTEM',
        channel: 'IN_APP',
      });
      this.logger.log(`Trial notification sent: "${title}" to user ${ownerId}`);
    } catch (err) {
      this.logger.error(`Failed to send trial notification`, err);
      throw err; // let BullMQ retry
    }
  }
}
