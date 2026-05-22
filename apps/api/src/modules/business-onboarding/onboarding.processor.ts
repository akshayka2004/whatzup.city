import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Processor('onboarding-queue')
export class OnboardingProcessor extends WorkerHost {
  private readonly logger = new Logger(OnboardingProcessor.name);

  constructor(private readonly db: DatabaseService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing onboarding job: ${job.name} (Job ID: ${job.id})`);

    switch (job.name) {
      case 'send-verification-email': {
        const { email, token, tenantId } = job.data;
        this.logger.log(
          `Sending verification email to ${email} (token: ${token}) under tenant: ${tenantId}`,
        );
        // In production, wire this to Mailgun/SES.
        break;
      }

      case 'process-business-verification': {
        const { businessId, tenantId } = job.data;
        this.logger.log(`Triggering onboarding verification check for business: ${businessId}`);

        // Automatically index document status details using OCR (simulate OCR document verification)
        const docs = await this.db.businessDocument.findMany({
          where: { tenantId, businessId, status: 'PENDING' },
        });

        for (const doc of docs) {
          this.logger.log(`OCR validating document: ${doc.documentType} (ID: ${doc.id})`);
          // Simulate simple validation (e.g. length check or metadata presence)
          if (doc.documentNumber && doc.documentNumber.length > 5) {
            this.logger.log(`Document metadata validated successfully for ${doc.id}`);
          }
        }
        break;
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        break;
    }
  }
}
