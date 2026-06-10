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
    // Accept either business.id OR entity.id — the onboarding wizard stores the
    // entity.id in `businessId`, so matching on business.id alone failed and no
    // BusinessDocument row was ever created.
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id: businessId }, { entityId: businessId }], deletedAt: null },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    const actualBusinessId = business.id;

    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    this.storageService.validateMimeType(dto.mimeType, allowedMimeTypes);

    // Enforce the 10MB bucket limit when the client reports a size.
    if (dto.fileSize !== undefined && dto.fileSize !== null) {
      this.storageService.validateFileSize(Number(dto.fileSize), 10 * 1024 * 1024);
    }

    if (dto.documentNumber) {
      const existingDocument = await this.db.businessDocument.findFirst({
        where: {
          tenantId,
          businessId: actualBusinessId,
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
      actualBusinessId,
      'document', // category: document => maps to verification-documents bucket
      dto.filename,
    );

    // Generate signed upload URL from StorageService
    const { uploadUrl } = await this.storageService.createSignedUploadUrl(
      'verification-documents',
      fileKey,
    );

    const bucketName = 'verification-documents';
    const dbUrl = JSON.stringify({ bucket: bucketName, path: fileKey });

    // Iteration-2 category-aware metadata. Stored alongside the legacy fileUrl
    // (kept for backward compatibility). A re-upload resets the review state so
    // the document goes back to PENDING for re-moderation.
    const meta: any = {
      fileUrl: dbUrl,
      status: 'PENDING',
      verificationStatus: 'PENDING',
      verificationNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      uploadedBy: userId,
      bucketName,
      storageKey: fileKey,
      documentPath: fileKey,
      documentCategory: dto.documentCategory ?? null,
      documentSubtype: dto.documentSubtype ?? null,
      issuedAuthority: dto.issuedAuthority,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      isMandatory: dto.isMandatory ?? true,
      isActive: true,
    };

    // Idempotent: re-uploading the same document type updates the existing row
    // instead of hitting the unique constraint
    // (tenantId, businessId, documentType, documentNumber).
    const existing = await this.db.businessDocument.findFirst({
      where: {
        tenantId,
        businessId: actualBusinessId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber ?? null,
        deletedAt: null,
      },
    });

    const document = existing
      ? await this.db.businessDocument.update({
          where: { id: existing.id },
          data: meta,
        })
      : await this.db.businessDocument.create({
          data: {
            tenantId,
            businessId: actualBusinessId,
            documentType: dto.documentType,
            documentNumber: dto.documentNumber,
            ...meta,
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
   * Admin per-document review — approve / reject / request re-upload. Records
   * reviewer, timestamp, and notes, and audit-logs the action. Each document is
   * actioned individually (no DB access required for moderators).
   */
  async reviewDocument(
    adminId: string,
    docId: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD',
    notes?: string,
  ) {
    const doc = await this.db.businessDocument.findFirst({
      where: { id: docId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const STATUS: Record<string, string> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      REQUEST_REUPLOAD: 'REUPLOAD_REQUESTED',
    };
    const status = STATUS[action];
    if (!status) throw new BadRequestException('Invalid review action');

    const updated = await this.db.businessDocument.update({
      where: { id: docId },
      data: {
        status,
        verificationStatus: status,
        verificationNotes: notes ?? doc.verificationNotes,
        rejectionReason: action === 'REJECT' ? (notes ?? doc.rejectionReason) : doc.rejectionReason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log({
      tenantId: doc.tenantId,
      userId: adminId,
      action: `DOCUMENT_${action}`,
      resource: 'BUSINESS_DOCUMENT',
      resourceId: docId,
      metadata: { notes, status },
    });

    return updated;
  }

  /**
   * Admin: generate a short-lived signed download URL for one document and log
   * the access. Never returns a public URL.
   */
  async getDocumentDownloadUrl(adminId: string, docId: string) {
    const doc = await this.db.businessDocument.findFirst({
      where: { id: docId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    let bucket = doc.bucketName || undefined;
    let key = doc.storageKey || undefined;
    if (!bucket || !key) {
      try {
        const parsed = JSON.parse(doc.fileUrl);
        bucket = parsed?.bucket;
        key = parsed?.path;
      } catch {
        /* legacy/plain URL */
      }
    }
    if (!bucket || !key) {
      throw new BadRequestException('Document has no resolvable storage location');
    }

    const url = await this.storageService.createSignedDownloadUrl(bucket, key, 600);

    await this.audit.log({
      tenantId: doc.tenantId,
      userId: adminId,
      action: 'DOCUMENT_VIEW',
      resource: 'BUSINESS_DOCUMENT',
      resourceId: docId,
    });

    return { url };
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
