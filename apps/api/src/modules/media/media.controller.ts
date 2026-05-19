import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  async getUploadUrl(@Body() body: { businessId: string; filename: string; mimeType: string }) {
    return this.mediaService.getSignedUploadUrl(body.businessId, body.filename, body.mimeType);
  }

  @Post()
  async create(@Body() data: any) {
    return this.mediaService.createRecord(data.businessId, data);
  }

  @Get('business/:businessId')
  async findByBusiness(@Param('businessId') businessId: string) {
    return this.mediaService.findByBusiness(businessId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
