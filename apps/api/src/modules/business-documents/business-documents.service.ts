import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Injectable()
export class BusinessDocumentsService {
  private readonly logger = new Logger(BusinessDocumentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly storageService: StorageService,
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
    this.storageService.validateMimeType(dto.mimeType, allowedMimeTypes);

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

    // Generate structured storage path using StorageService
    const fileKey = this.storageService.generateStoragePath(
      tenantId,
      businessId,
      'document', // category: document => maps to verification-documents bucket
      dto.filename,
    );

    // Generate signed upload URL from StorageService
    const { uploadUrl } = await this.storageService.createSignedUploadUrl(
      'verification-documents',
      fileKey,
    );

    const dbUrl = JSON.stringify({ bucket: 'verification-documents', path: fileKey });

    // Save PENDING document record to DB
    const document = await this.db.businessDocument.create({
      data: {
        tenantId,
        businessId,
        documentType: dto.documentType,
        fileUrl: dbUrl,
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

  /**
   * Server-side upload: receives the raw file (multipart), pushes it straight
   * to Supabase via the service role, and records a PENDING BusinessDocument.
   * Bypasses fragile browser→Supabase signed-URL PUTs and guarantees the file
   * lands in the verification-documents bucket.
   */
  async uploadDocumentDirect(
    userId: string,
    tenantId: string,
    businessId: string,
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
    meta: { documentType: string; documentNumber?: string; issuedAuthority?: string },
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file was provided in the upload.');
    }

    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const mimeType = file.mimetype || 'application/octet-stream';
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    this.storageService.validateMimeType(mimeType, allowedMimeTypes);
    this.storageService.validateFileSize(file.size || file.buffer.length, 10 * 1024 * 1024);

    const fileKey = this.storageService.generateStoragePath(
      tenantId,
      businessId,
      'document',
      file.originalname || 'document.pdf',
    );

    // Upload straight to the private verification-documents bucket.
    const { bucket, path } = await this.storageService.uploadPrivateFile(
      'verification-documents',
      fileKey,
      file.buffer,
      mimeType,
    );

    const dbUrl = JSON.stringify({ bucket, path });

    // Upsert-style: avoid unique-constraint clash on re-upload of same type.
    const existing = await this.db.businessDocument.findFirst({
      where: { tenantId, businessId, documentType: meta.documentType, deletedAt: null },
    });

    const document = existing
      ? await this.db.businessDocument.update({
          where: { id: existing.id },
          data: {
            fileUrl: dbUrl,
            status: 'PENDING',
            documentNumber: meta.documentNumber,
            issuedAuthority: meta.issuedAuthority,
          },
        })
      : await this.db.businessDocument.create({
          data: {
            tenantId,
            businessId,
            documentType: meta.documentType,
            fileUrl: dbUrl,
            status: 'PENDING',
            documentNumber: meta.documentNumber,
            issuedAuthority: meta.issuedAuthority,
          },
        });

    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_UPLOAD',
      resource: 'BUSINESS_DOCUMENT',
      resourceId: document.id,
      metadata: { documentType: meta.documentType, fileKey },
    });

    return { documentId: document.id, bucket, path, status: 'PENDING' };
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

    // Parse and delete from storage
    if (document.fileUrl && document.fileUrl.startsWith('{')) {
      try {
        const parsed = JSON.parse(document.fileUrl);
        if (parsed && typeof parsed.bucket === 'string' && typeof parsed.path === 'string') {
          await this.storageService.deleteFile(parsed.bucket, parsed.path);
        }
      } catch (err: any) {
        this.logger.error(`Failed to delete document file from storage: ${err.message}`);
      }
    }

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
