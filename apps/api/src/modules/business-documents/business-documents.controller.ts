import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Request Cloudflare R2 presigned upload URL and save document info' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documentsService.createUploadUrl(userId, tenantId, businessId, dto);
  }

  @Post(':id/documents/upload')
  @ApiOperation({
    summary: 'Server-side upload of a verification document (multipart). Stores file in the ' +
      'verification-documents bucket and records it in BusinessDocument.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocumentDirect(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
    @UploadedFile() file: any,
    @Body() body: { documentType?: string; documentNumber?: string; issuedAuthority?: string },
  ) {
    return this.documentsService.uploadDocumentDirect(userId, tenantId, businessId, file, {
      documentType: body?.documentType || 'REGISTRATION_CERTIFICATE',
      documentNumber: body?.documentNumber,
      issuedAuthority: body?.issuedAuthority,
    });
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
