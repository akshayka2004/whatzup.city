import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { GetUploadUrlDto, CreateMediaDto } from './dto/media.dto';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Public()
  @Put('mock-upload')
  async mockUpload() {
    return { success: true, message: 'Mock upload successful' };
  }

  @Post('upload-url')
  async getUploadUrl(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: GetUploadUrlDto,
  ) {
    return this.mediaService.getSignedUploadUrl(
      tenantId,
      body.businessId,
      body.filename,
      body.mimeType,
      { userId, role },
    );
  }

  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: CreateMediaDto,
  ) {
    return this.mediaService.createRecord(
      tenantId,
      body.businessId,
      body,
      { userId, role },
    );
  }

  @Get('business/:businessId')
  async findByBusiness(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('businessId') businessId: string,
  ) {
    await this.mediaService.validateBusinessAccess(tenantId, businessId, userId, role);
    return this.mediaService.findByBusiness(tenantId, businessId);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.mediaService.deleteRecord(tenantId, userId, role, id);
  }
}
