import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessMediaService } from './business-media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Business Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessMediaController {
  constructor(private readonly mediaService: BusinessMediaService) {}

  @Post(':id/media')
  @ApiOperation({ summary: 'Request R2 presigned upload URL and save media database entry' })
  async uploadMedia(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
    @Body() dto: UploadMediaDto,
  ) {
    return this.mediaService.createUploadUrl(userId, tenantId, businessId, dto);
  }

  @Get(':id/media')
  @ApiOperation({ summary: 'Get all uploaded media assets for business' })
  async getMedia(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
  ) {
    return this.mediaService.getBusinessMedia(userId, tenantId, businessId);
  }

  @Delete('media/:mediaId')
  @ApiOperation({ summary: 'Delete media item asset' })
  async deleteMedia(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.mediaService.deleteMedia(userId, tenantId, mediaId);
  }
}
