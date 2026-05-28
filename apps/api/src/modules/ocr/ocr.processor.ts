import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OcrService } from './ocr.service';
import { BillVerificationRepository } from '../../common/database/repositories/bill-verification.repository';
import { AuditService } from '../audit/audit.service';
import { BillRepository } from '../../common/database/repositories/bill.repository';
import { URL } from 'url';

// Limit to 1 concurrent OCR job — Tesseract is CPU/memory heavy.
// Queue additional jobs; they process serially without blocking the event loop.
@Processor('ocr-queue', { concurrency: 1 })
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly ocrService: OcrService,
    private readonly verificationRepo: BillVerificationRepository,
    private readonly billRepo: BillRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  /**
   * SSRF Protection: Validate that the image URL is not pointing to internal/private networks
   * and belongs to the allowed cloud storage domains in production.
   */
  private validateImageUrl(urlStr: string): void {
    if (!urlStr) {
      throw new Error('Image URL is required');
    }

    const parsedUrl = new URL(urlStr);

    // Block non-HTTP protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Block metadata service IP, localhost/loopback, or broadcast/wildcard IPs
    const blockedIps = [
      '169.254.169.254', // AWS metadata
      '127.0.0.1',
      'localhost',
      '0.0.0.0',
      '::1',
    ];

    // Block local/internal range IPs (RFC 1918)
    const isInternalIp =
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.');

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (blockedIps.includes(hostname) || isInternalIp) {
      if (nodeEnv === 'production') {
        throw new Error('Access to internal hostnames or IP addresses is forbidden in production');
      }
    }

    // Restrict production hosts to the configured Supabase Storage domain
    if (nodeEnv === 'production') {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      if (supabaseUrl) {
        try {
          const supUrl = new URL(supabaseUrl);
          const isSupabaseHost = hostname === supUrl.hostname || hostname.endsWith('.supabase.co');
          if (!isSupabaseHost) {
            throw new Error('Access is restricted to the configured Supabase Storage domain');
          }
        } catch (e) {
          throw new Error(`Supabase URL configuration parsing failed: ${e.message}`);
        }
      }
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, billId, imageUrl, userId } = job.data;

    this.logger.log(`Processing OCR for bill: ${billId} (Job: ${job.id})`);

    try {
      // 1. SSRF Validation
      this.validateImageUrl(imageUrl);

      // 2. Mark Verification as PROCESSING
      const verification = await this.verificationRepo.findByBillId(tenantId, billId);
      if (verification) {
        await this.verificationRepo.update(tenantId, verification.id, {
          status: 'PENDING', // Keep pending for admin, but it's processing via queue
        });
      }

      await this.billRepo.update(tenantId, billId, { status: 'PROCESSING' });

      // 3. Run OCR Extraction (90-second hard timeout to prevent stall)
      const ocrResult = await Promise.race([
        this.ocrService.extractText(imageUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OCR timeout after 90s')), 90_000),
        ),
      ]);

      // 4. Save extracted metadata
      if (verification) {
        await this.verificationRepo.update(tenantId, verification.id, {
          ocrMetadata: {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            parsed: ocrResult.parsedData,
          },
        });
      }

      await this.auditService.log({
        tenantId,
        userId,
        action: 'OCR_PROCESSING_COMPLETED',
        resource: 'BILL',
        resourceId: billId,
        metadata: { confidence: ocrResult.confidence },
      });

      this.logger.log(`OCR complete for bill: ${billId}`);
    } catch (error) {
      this.logger.error(`OCR failed for bill: ${billId} - ${error.message}`);

      // Mark as UPLOADED if OCR fails heavily (needs manual admin review)
      await this.billRepo.update(tenantId, billId, { status: 'UPLOADED' });

      throw error; // Let BullMQ handle retries
    }
  }
}
