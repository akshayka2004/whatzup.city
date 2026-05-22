import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../common/database/database.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'text/plain': ['txt'],
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3Client: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET_NAME') || 'saas-media';

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.logger.warn('Cloudflare R2 configuration missing, Media uploads will fail.');
    }
  }

  /**
   * Validate that the business belongs to the tenant and the user is either:
   * 1. Owner of the business
   * 2. Active member of staff for the business
   * 3. A platform administrator (SUPER_ADMIN or MASTER_ADMIN)
   */
  async validateBusinessAccess(
    tenantId: string,
    businessId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      include: {
        staff: {
          where: { userId },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant mismatch: Business does not belong to this tenant');
    }

    // Bypass check for platform administrators
    if (role === 'SUPER_ADMIN' || role === 'MASTER_ADMIN') {
      return;
    }

    const isOwner = business.ownerId === userId;
    const isStaff = business.staff.length > 0 && business.staff[0].isActive;

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You do not have administrative access to this business');
    }
  }

  /**
   * Validate file extension against allowed MIME types to prevent extension spoofing
   */
  validateFileExtension(filename: string, mimeType: string): void {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) {
      throw new BadRequestException('File must have a valid extension');
    }

    const allowedExtensions = ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
    if (!allowedExtensions || !allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `File extension .${ext} does not match the provided MIME type ${mimeType}`,
      );
    }
  }

  /**
   * Generates a short-lived signed URL for direct uploading to Cloudflare R2
   */
  async getSignedUploadUrl(
    tenantId: string,
    businessId: string,
    filename: string,
    mimeType: string,
    userContext?: { userId: string; role: string },
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    // 1. Enforce BOLA checks if userContext is provided
    if (userContext) {
      await this.validateBusinessAccess(tenantId, businessId, userContext.userId, userContext.role);
    }

    // 2. Validate file extension
    this.validateFileExtension(filename, mimeType);

    const uniqueId = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const fileKey = `${tenantId}/businesses/${businessId}/${uniqueId}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (!this.s3Client) {
      this.logger.warn(
        `Cloudflare R2 is not configured. Generating mock upload URL for key: ${fileKey}`,
      );
      const uploadUrl = `/api/media/mock-upload?key=${fileKey}`;
      return { uploadUrl, fileKey };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: mimeType,
    });

    // Generate URL valid for 5 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

    return { uploadUrl, fileKey };
  }

  async createRecord(
    tenantId: string,
    businessId: string,
    data: { url: string; type: string; filename: string; size: number; mimeType: string },
    userContext?: { userId: string; role: string },
  ) {
    // Enforce BOLA checks on create if userContext is provided
    if (userContext) {
      await this.validateBusinessAccess(tenantId, businessId, userContext.userId, userContext.role);
    }
    this.validateFileExtension(data.filename, data.mimeType);

    return this.db.media.create({ data: { tenantId, businessId, ...data } });
  }

  async findByBusiness(tenantId: string, businessId: string) {
    return this.db.media.findMany({
      where: { tenantId, businessId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async delete(tenantId: string, id: string) {
    return this.db.media.delete({ where: { tenantId, id } });
  }

  async deleteRecord(tenantId: string, userId: string, role: string, id: string) {
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media record not found');
    }

    // Enforce BOLA checks on delete
    await this.validateBusinessAccess(tenantId, media.businessId, userId, role);

    return this.db.media.delete({ where: { tenantId, id } });
  }
}
