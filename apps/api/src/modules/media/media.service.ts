import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../common/database/database.service';

/**
 * Media Service — Abstraction layer for file storage
 * Currently implements local/mock storage, ready for Cloudflare R2 integration
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate a signed upload URL for direct client-to-storage uploads
   * TODO: Implement with Cloudflare R2 S3-compatible API
   */
  async getSignedUploadUrl(
    businessId: string,
    filename: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const fileKey = `businesses/${businessId}/${Date.now()}-${filename}`;
    // Placeholder: In production, generate presigned URL via R2/S3
    const uploadUrl = `${this.config.get('API_URL', 'http://localhost:4000')}/api/v1/media/upload`;
    this.logger.log(`Generated upload URL for: ${fileKey}`);
    return { uploadUrl, fileKey };
  }

  async createRecord(
    businessId: string,
    data: { url: string; type: string; filename: string; size: number; mimeType: string },
  ) {
    return this.db.media.create({ data: { businessId, ...data } });
  }

  async findByBusiness(businessId: string) {
    return this.db.media.findMany({ where: { businessId }, orderBy: { sortOrder: 'asc' } });
  }

  async delete(id: string) {
    // TODO: Delete from R2 storage before removing DB record
    return this.db.media.delete({ where: { id } });
  }
}
