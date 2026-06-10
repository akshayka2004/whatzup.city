import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessDocumentsService } from './business-documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { getRequirementsForCategory } from './document-requirements';

@ApiTags('Business Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessDocumentsController {
  constructor(private readonly documentsService: BusinessDocumentsService) {}

  @Get('documents/requirements')
  @ApiOperation({ summary: 'Category-aware document requirements (universal + category-specific)' })
  async documentRequirements(@Query('category') category?: string) {
    return getRequirementsForCategory(category);
  }

  // ── Admin: per-document review (approve / reject / request re-upload) ──
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Post('documents/:docId/review')
  @ApiOperation({ summary: 'Admin reviews a single verification document' })
  async reviewDocument(
    @CurrentUser('id') adminId: string,
    @Param('docId') docId: string,
    @Body() body: { action: 'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD'; notes?: string },
  ) {
    return this.documentsService.reviewDocument(adminId, docId, body.action, body.notes);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('documents/:docId/download')
  @ApiOperation({ summary: 'Admin gets a signed download URL for a document' })
  async downloadDocument(
    @CurrentUser('id') adminId: string,
    @Param('docId') docId: string,
  ) {
    return this.documentsService.getDocumentDownloadUrl(adminId, docId);
  }

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
