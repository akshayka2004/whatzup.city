import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { StorageService } from './storage.service';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum UploadCategory {
  AVATAR = 'avatar',
  LOGO = 'logo',
  BANNER = 'banner',
  GALLERY = 'gallery',
  BILL = 'bill',
  DOCUMENT = 'document',
  NOTIFICATION = 'notification',
}

export class GetUploadUrlDto {
  @IsEnum(UploadCategory)
  @IsNotEmpty()
  category: UploadCategory;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsOptional()
  entityId?: string;
}

const CATEGORY_CONFIG: Record<
  UploadCategory,
  { bucket: string; maxSize: number; allowedTypes: string[] }
> = {
  [UploadCategory.AVATAR]: {
    bucket: 'profile-media',
    maxSize: 3 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadCategory.LOGO]: {
    bucket: 'business-media',
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadCategory.BANNER]: {
    bucket: 'business-media',
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadCategory.GALLERY]: {
    bucket: 'business-media',
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadCategory.BILL]: {
    bucket: 'bill-uploads',
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  [UploadCategory.DOCUMENT]: {
    bucket: 'verification-documents',
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  [UploadCategory.NOTIFICATION]: {
    bucket: 'notification-media',
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Request signed upload URL and storage path metadata' })
  async getUploadUrl(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: GetUploadUrlDto,
  ) {
    const config = CATEGORY_CONFIG[body.category];
    if (!config) {
      throw new BadRequestException(`Unsupported upload category: ${body.category}`);
    }

    // 1. Perform extensions & MIME validation
    this.storageService.validateMimeType(body.mimeType, config.allowedTypes);
    
    const ext = body.filename.split('.').pop()?.toLowerCase();
    if (!ext) {
      throw new BadRequestException('Filename must have a valid extension');
    }

    // 2. Resolve final storage fileKey path
    const entityId = body.entityId || userId;
    const fileKey = this.storageService.generateStoragePath(
      tenantId,
      entityId,
      body.category,
      body.filename,
    );

    // 3. Create signed URL on Supabase
    const { uploadUrl } = await this.storageService.createSignedUploadUrl(
      config.bucket,
      fileKey,
    );

    return {
      uploadUrl,
      fileKey,
      bucket: config.bucket,
    };
  }
}
