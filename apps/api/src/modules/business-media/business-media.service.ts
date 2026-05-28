import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { MediaService } from '../media/media.service';
import { AuditService } from '../audit/audit.service';
import { UploadMediaDto } from './dto/upload-media.dto';

@Injectable()
export class BusinessMediaService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mediaService: MediaService,
    private readonly audit: AuditService,
  ) {}

  async createUploadUrl(userId: string, tenantId: string, businessId: string, dto: UploadMediaDto) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm'];
    if (dto.mediaType === 'PROMO_VIDEO') {
      if (!videoTypes.includes(dto.mimeType)) {
        throw new BadRequestException('Promotional videos must be MP4 or WebM');
      }
    } else if (!imageTypes.includes(dto.mimeType)) {
      throw new BadRequestException('Business images must be JPEG, PNG, or WebP');
    }

    // Apply Limits Validation
    const existingMedia = await this.db.media.findMany({
      where: { tenantId, businessId, deletedAt: null },
    });

    if (dto.mediaType === 'LOGO') {
      const logos = existingMedia.filter((m) => m.type === 'LOGO');
      if (logos.length >= 1) {
        throw new BadRequestException(
          'A business can only have one active logo. Delete the existing one first.',
        );
      }
    } else if (dto.mediaType === 'COVER_BANNER') {
      const banners = existingMedia.filter((m) => m.type === 'COVER_BANNER');
      if (banners.length >= 1) {
        throw new BadRequestException(
          'A business can only have one active cover banner. Delete the existing one first.',
        );
      }
    } else if (dto.mediaType === 'GALLERY') {
      const gallery = existingMedia.filter((m) => m.type === 'GALLERY');
      if (gallery.length >= 15) {
        throw new BadRequestException('Gallery uploads are limited to 15 items.');
      }
    } else if (dto.mediaType === 'PROMO_VIDEO') {
      const videos = existingMedia.filter((m) => m.type === 'PROMO_VIDEO');
      if (videos.length >= 1) {
        throw new BadRequestException('A business can only have one promotional video.');
      }
      if (dto.size > 50 * 1024 * 1024) {
        throw new BadRequestException('Promotional video file size exceeds the 50MB limit.');
      }
    }

    // Generate Presigned URL
    const { uploadUrl, fileKey } = await this.mediaService.getSignedUploadUrl(
      tenantId,
      businessId,
      dto.filename,
      dto.mimeType,
    );

    const dbUrl = JSON.stringify({ bucket: 'business-media', path: fileKey });

    // Save Media entry
    const media = await this.db.media.create({
      data: {
        tenantId,
        businessId,
        url: dbUrl,
        type: dto.mediaType,
        filename: dto.filename,
        size: dto.size,
        mimeType: dto.mimeType,
      },
    });

    // If logo or cover banner, update direct Business fields as well
    if (dto.mediaType === 'LOGO') {
      await this.db.business.update({
        where: { id: businessId },
        data: { logo: dbUrl },
      });
    } else if (dto.mediaType === 'COVER_BANNER') {
      await this.db.business.update({
        where: { id: businessId },
        data: { coverImage: dbUrl },
      });
    }

    await this.audit.log({
      tenantId,
      userId,
      action: 'MEDIA_UPLOAD_REQUEST',
      resource: 'MEDIA',
      resourceId: media.id,
      metadata: { mediaType: dto.mediaType },
    });

    return { uploadUrl, fileKey, mediaId: media.id };
  }

  async getBusinessMedia(userId: string, tenantId: string, businessId: string) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    return this.db.media.findMany({
      where: { tenantId, businessId, deletedAt: null },
    });
  }

  async deleteMedia(userId: string, tenantId: string, id: string) {
    const media = await this.db.media.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { business: true },
    });
    if (!media) throw new NotFoundException('Media item not found');
    if (media.business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    await this.db.media.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Clean up direct business references if applicable
    if (media.type === 'LOGO') {
      await this.db.business.update({
        where: { id: media.businessId },
        data: { logo: null },
      });
    } else if (media.type === 'COVER_BANNER') {
      await this.db.business.update({
        where: { id: media.businessId },
        data: { coverImage: null },
      });
    }

    await this.audit.log({
      tenantId,
      userId,
      action: 'MEDIA_DELETE',
      resource: 'MEDIA',
      resourceId: id,
    });

    return { message: 'Media item deleted successfully' };
  }
}
