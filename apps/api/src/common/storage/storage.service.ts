import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseUrl: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabaseClient: SupabaseClient,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.supabaseUrl = this.config.get<string>('SUPABASE_URL', '').replace(/\/$/, '');
  }

  /**
   * Generates a unique, structured folder hierarchy for file isolation
   * Path format: tenantId/entityId/timestamp-random.ext
   */
  generateStoragePath(
    tenantId: string,
    entityId: string,
    category: string,
    filename: string,
  ): string {
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    const uniqueId = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const ext = filename.split('.').pop()?.toLowerCase();
    
    // Group files by entity ID if provided, else category subfolder
    const folder = entityId ? `${category}/${entityId}` : category;
    return `${tenantId}/${folder}/${uniqueId}.${ext}`;
  }

  /**
   * Generates a signed upload URL valid for 5 minutes (300 seconds)
   */
  async createSignedUploadUrl(
    bucket: string,
    fileKey: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    try {
      const { data, error } = await this.supabaseClient.storage
        .from(bucket)
        .createSignedUploadUrl(fileKey);

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create signed upload URL');
      }

      return { uploadUrl: data.signedUrl, fileKey };
    } catch (err: any) {
      this.logger.error(`Error creating signed upload URL in bucket ${bucket} for path ${fileKey}: ${err.message}`);
      throw new InternalServerErrorException(`Storage service error: ${err.message}`);
    }
  }

  /**
   * Generates or fetches from cache a signed download URL for private files
   * Expiry: 60 seconds. Caches in Redis for 50 seconds.
   */
  async createSignedDownloadUrl(
    bucket: string,
    fileKey: string,
    expiresInSeconds = 60,
  ): Promise<string> {
    const cacheKey = `signed-url:${bucket}:${fileKey}`;
    try {
      const cachedUrl = await this.redis.get<string>(cacheKey);
      if (cachedUrl) {
        return cachedUrl;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to read from Redis cache: ${err.message}`);
    }

    try {
      const { data, error } = await this.supabaseClient.storage
        .from(bucket)
        .createSignedUrl(fileKey, expiresInSeconds);

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create signed download URL');
      }

      // Cache for 50 seconds to keep a buffer margin before actual expiry
      try {
        await this.redis.set(cacheKey, data.signedUrl, expiresInSeconds - 10);
      } catch (err: any) {
        this.logger.warn(`Failed to write to Redis cache: ${err.message}`);
      }

      return data.signedUrl;
    } catch (err: any) {
      this.logger.error(`Error creating signed download URL: ${err.message}`);
      throw new InternalServerErrorException(`Storage service download error: ${err.message}`);
    }
  }

  /**
   * Generates a static public URL for assets in public buckets
   */
  generatePublicUrl(bucket: string, fileKey: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${fileKey}`;
  }

  /**
   * Direct file upload (Buffer-based) for public buckets
   */
  async uploadPublicFile(
    bucket: string,
    fileKey: string,
    file: Buffer,
    mimeType: string,
  ): Promise<string> {
    const { error } = await this.supabaseClient.storage
      .from(bucket)
      .upload(fileKey, file, { contentType: mimeType, upsert: true });

    if (error) {
      this.logger.error(`Error uploading public file: ${error.message}`);
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }

    return this.generatePublicUrl(bucket, fileKey);
  }

  /**
   * Direct file upload (Buffer-based) for private buckets
   */
  async uploadPrivateFile(
    bucket: string,
    fileKey: string,
    file: Buffer,
    mimeType: string,
  ): Promise<{ bucket: string; path: string }> {
    const { error } = await this.supabaseClient.storage
      .from(bucket)
      .upload(fileKey, file, { contentType: mimeType, upsert: true });

    if (error) {
      this.logger.error(`Error uploading private file: ${error.message}`);
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }

    return { bucket, path: fileKey };
  }

  /**
   * Deletes a file from a storage bucket
   */
  async deleteFile(bucket: string, fileKey: string): Promise<void> {
    const { error } = await this.supabaseClient.storage
      .from(bucket)
      .remove([fileKey]);

    if (error) {
      this.logger.error(`Failed to delete file key ${fileKey} from bucket ${bucket}: ${error.message}`);
      throw new InternalServerErrorException(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Validates file size against category bounds
   */
  validateFileSize(fileSize: number, maxSize: number): void {
    if (fileSize > maxSize) {
      throw new BadRequestException(
        `File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${(
          maxSize / (1024 * 1024)
        ).toFixed(1)}MB`,
      );
    }
  }

  /**
   * Validates file MIME types to prevent malicious uploads
   */
  validateMimeType(mimeType: string, allowedTypes: string[]): void {
    if (!allowedTypes.includes(mimeType.toLowerCase())) {
      throw new BadRequestException(`MIME type ${mimeType} is not permitted for this file category.`);
    }
  }
}
