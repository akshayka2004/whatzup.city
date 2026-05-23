import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../common/database/database.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private supabaseClient: SupabaseClient | null = null;
  private readonly bucket: string;
  private readonly maxUploadSize: number;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET') || 'saas-uploads';
    const sizeLimit = this.config.get<number>('MAX_UPLOAD_SIZE');
    this.maxUploadSize = sizeLimit ? Number(sizeLimit) : 10 * 1024 * 1024; // 10MB default

    if (supabaseUrl && serviceRoleKey) {
      this.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } else {
      this.logger.warn('Supabase Storage configuration missing, Media uploads will fail.');
    }
  }

  onModuleInit() {
    // Run cleanup job every 24 hours (86400000 ms)
    setInterval(() => {
      this.cleanOrphanedFiles().catch((err) =>
        this.logger.error(`Error running interval cleanup job: ${err.message}`),
      );
    }, 24 * 60 * 60 * 1000);

    // Also run it 5 minutes after startup to clean up immediately
    setTimeout(() => {
      this.cleanOrphanedFiles().catch((err) =>
        this.logger.error(`Error running startup cleanup job: ${err.message}`),
      );
    }, 5 * 60 * 1000);
  }

  /**
   * Scans Supabase Storage for orphaned files and removes them.
   */
  async cleanOrphanedFiles() {
    if (!this.supabaseClient) return;

    this.logger.log('Starting orphaned files cleanup job...');
    try {
      const { data: files, error } = await this.supabaseClient.storage
        .from(this.bucket)
        .list('', { limit: 1000 });

      if (error || !files) {
        throw new Error(error?.message || 'Failed to list files');
      }

      const now = new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      for (const file of files) {
        // Skip files created within 24 hours
        if (!file.created_at || new Date(file.created_at) > cutoff) {
          continue;
        }

        const fileKey = file.name;

        // Check if fileKey is referenced in DB
        const isReferenced = await this.checkFileReferenceInDb(fileKey);
        if (!isReferenced) {
          this.logger.log(`Deleting orphaned storage file: ${fileKey}`);
          await this.supabaseClient.storage.from(this.bucket).remove([fileKey]);
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in file cleanup job: ${err.message}`);
    }
  }

  private async checkFileReferenceInDb(fileKey: string): Promise<boolean> {
    // Check Media
    const mediaCount = await this.db.media.count({
      where: { url: { contains: fileKey } },
    });
    if (mediaCount > 0) return true;

    // Check BusinessDocument
    const docCount = await this.db.businessDocument.count({
      where: { fileUrl: { contains: fileKey } },
    });
    if (docCount > 0) return true;

    // Check Business Logo/Cover
    const bizCount = await this.db.business.count({
      where: {
        OR: [
          { logo: { contains: fileKey } },
          { coverImage: { contains: fileKey } },
        ],
      },
    });
    if (bizCount > 0) return true;

    // Check User Avatar
    const userCount = await this.db.user.count({
      where: { avatar: { contains: fileKey } },
    });
    if (userCount > 0) return true;

    // Check Bill Image
    const billCount = await this.db.bill.count({
      where: { billImage: { contains: fileKey } },
    });
    if (billCount > 0) return true;

    return false;
  }

  private getFileKeyFromUrl(url: string): string | null {
    if (url.startsWith('/')) {
      // Mock local URL
      return null;
    }
    const bucketPart = `/public/${this.bucket}/`;
    const index = url.indexOf(bucketPart);
    if (index !== -1) {
      return url.substring(index + bucketPart.length);
    }
    return null;
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
   * Generates a short-lived signed URL for direct uploading to Supabase Storage
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

    if (!this.supabaseClient) {
      this.logger.warn(
        `Supabase Storage is not configured. Generating mock upload URL for key: ${fileKey}`,
      );
      const uploadUrl = `/api/media/mock-upload?key=${fileKey}`;
      return { uploadUrl, fileKey };
    }

    try {
      const { data, error } = await this.supabaseClient.storage
        .from(this.bucket)
        .createSignedUploadUrl(fileKey);

      if (error || !data) {
        throw new Error(error?.message || 'Failed to generate signed URL');
      }

      return { uploadUrl: data.signedUrl, fileKey };
    } catch (err: any) {
      this.logger.error(`Error generating signed upload URL: ${err.message}`);
      throw new InternalServerErrorException(`Storage service unavailable: ${err.message}`);
    }
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

    if (data.size > this.maxUploadSize) {
      throw new BadRequestException(
        `File size exceeds maximum upload limit of ${this.maxUploadSize / (1024 * 1024)}MB`,
      );
    }

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

    const fileKey = this.getFileKeyFromUrl(media.url);
    if (fileKey && this.supabaseClient) {
      try {
        await this.supabaseClient.storage.from(this.bucket).remove([fileKey]);
      } catch (err: any) {
        this.logger.error(`Failed to remove file from Supabase Storage: ${err.message}`);
      }
    }

    return this.db.media.delete({ where: { tenantId, id } });
  }
}
