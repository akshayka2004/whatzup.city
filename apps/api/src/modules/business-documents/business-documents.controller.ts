import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessDocumentsService } from './business-documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Business Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessDocumentsController {
  constructor(private readonly documentsService: BusinessDocumentsService) {}

  @Post(':id/documents')
  @ApiOperation({ summary: 'Create a signed upload URL and record a PENDING verification document' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documentsService.createUploadUrl(userId, tenantId, businessId, dto);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all uploaded verification documents for business' })
  async getDocuments(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
  ) {
    return this.documentsService.getBusinessDocuments(userId, tenantId, businessId);
  }

  @Delete('documents/:docId')
  @ApiOperation({ summary: 'Delete verification document' })
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('docId') docId: string,
  ) {
    return this.documentsService.deleteDocument(userId, tenantId, docId);
  }
}
