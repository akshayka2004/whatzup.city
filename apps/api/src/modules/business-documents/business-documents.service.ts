import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { MediaService } from '../media/media.service';
import { AuditService } from '../audit/audit.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Injectable()
export class BusinessDocumentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mediaService: MediaService,
    private readonly audit: AuditService,
  ) {}

  async createUploadUrl(
    userId: string,
    tenantId: string,
    businessId: string,
    dto: UploadDocumentDto,
  ) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(dto.mimeType)) {
      throw new BadRequestException('Document must be a PDF or image file');
    }

    if (dto.documentNumber) {
      const existingDocument = await this.db.businessDocument.findFirst({
        where: {
          tenantId,
          businessId,
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
          deletedAt: null,
        },
      });
      if (existingDocument) {
        throw new BadRequestException('This document number is already uploaded');
      }
    }

    // Generate signed upload URL from MediaService
    const { uploadUrl, fileKey } = await this.mediaService.getSignedUploadUrl(
      tenantId,
      businessId,
      dto.filename,
      dto.mimeType,
    );

    // Save PENDING document record to DB
    const document = await this.db.businessDocument.create({
      data: {
        tenantId,
        businessId,
        documentType: dto.documentType,
        fileUrl: fileKey, // File key in R2 bucket
        status: 'PENDING',
        documentNumber: dto.documentNumber,
        issuedAuthority: dto.issuedAuthority,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_UPLOAD_REQUEST',
      resource: 'BUSINESS_DOCUMENT',
      resourceId: document.id,
      metadata: { documentType: dto.documentType },
    });

    return { uploadUrl, fileKey, documentId: document.id };
  }

  async getBusinessDocuments(userId: string, tenantId: string, businessId: string) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    return this.db.businessDocument.findMany({
      where: { tenantId, businessId, deletedAt: null },
    });
  }

  async deleteDocument(userId: string, tenantId: string, id: string) {
    const document = await this.db.businessDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { business: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    if (document.business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    await this.db.businessDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_DELETE',
      resource: 'BUSINESS_DOCUMENT',
      resourceId: id,
    });

    return { message: 'Document deleted successfully' };
  }
}
