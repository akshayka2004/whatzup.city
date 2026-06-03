import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { SearchService } from '../search/search.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService, NotificationPriority } from '../notifications/notifications.service';
import { StorageService } from '../../common/storage/storage.service';
import { ApproveOnboardingDto, RejectOnboardingDto } from './dto/verification-action.dto';
import { EntityType } from '@prisma/client';

@Injectable()
export class OnboardingVerificationService {
  private readonly logger = new Logger(OnboardingVerificationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly searchService: SearchService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Normalize a document row (UploadedDocument or BusinessDocument) into the
   * shape the admin review UI expects. Converts a stored {bucket,path} JSON
   * fileUrl into a short-lived signed download URL so the file is viewable.
   */
  private async normalizeDocument(doc: any): Promise<any> {
    let fileUrl: string = doc.fileUrl || '#';
    let name: string = doc.documentType || 'Document';
    try {
      if (typeof fileUrl === 'string' && fileUrl.startsWith('{')) {
        const parsed = JSON.parse(fileUrl);
        if (parsed?.bucket && parsed?.path) {
          name = String(parsed.path).split('/').pop() || name;
          // 10-minute signed URL — long enough for admin review session.
          fileUrl = await this.storage.createSignedDownloadUrl(parsed.bucket, parsed.path, 600);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to sign document ${doc.id}: ${err.message}`);
      fileUrl = '#';
    }
    return {
      id: doc.id,
      name,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber ?? null,
      issuedAuthority: doc.issuedAuthority ?? null,
      status: doc.status,
      fileUrl,
    };
  }

  /**
   * Merge entity-level UploadedDocuments and business-level BusinessDocuments
   * into a single signed `entity.documents` array for the review panel.
   * Business onboarding stores verification files in BusinessDocument (keyed by
   * businessId), which the entity.documents include alone would miss.
   */
  private async attachDocuments(req: any): Promise<any> {
    if (!req.entity) return req;
    const rawDocs: any[] = [...(req.entity.documents || [])];

    const businessId = req.entity.business?.id;
    if (businessId) {
      const bizDocs = await this.db.businessDocument.findMany({
        where: { businessId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      rawDocs.push(...bizDocs);
    }

    const documents = await Promise.all(rawDocs.map((d) => this.normalizeDocument(d)));
    return { ...req, entity: { ...req.entity, documents } };
  }

  async getPending(
    tenantId: string,
    page = 1,
    limit = 20,
    filters: { status?: string; search?: string; type?: EntityType } = {},
    actorRole?: string,
  ) {
    const skip = (page - 1) * limit;

    const defaultTenant = await this.db.tenant.findUnique({
      where: { slug: 'default' },
    });
    const isDefaultPlatformAdmin = defaultTenant && defaultTenant.id === tenantId;

    const where: any = {
      status: filters.status || { in: ['PENDING', 'UNDER_REVIEW'] },
    };

    if (!isDefaultPlatformAdmin) {
      where.tenantId = tenantId;
    }

    if (filters.type) {
      where.entity = {
        type: filters.type,
      };
    }

    if (filters.search) {
      where.entity = {
        ...(where.entity || {}),
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.db.verificationRequest.findMany({
        where,
        include: {
          entity: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              documents: true,
              business: {
                include: {
                  category: { select: { id: true, name: true } },
                },
              },
              influencerProfile: true,
              professionalProfile: true,
              eventOrganizerProfile: true,
              organizationProfile: true,
              governmentProfile: true,
            },
          },
          verifier: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.db.verificationRequest.count({
        where,
      }),
    ]);

    let finalData = data;
    if (actorRole !== 'SUPER_ADMIN') {
      finalData = data.map((req: any) => {
        // Deep clone or shallow copy nested objects to avoid mutating prisma cached values directly
        if (req.entity?.user) {
          const userCopy = { ...req.entity.user };
          delete userCopy.email;
          delete userCopy.phone;
          return {
            ...req,
            entity: {
              ...req.entity,
              user: userCopy,
            },
          };
        }
        return req;
      });
    }

    // Enrich each request with merged + signed document URLs (entity-level
    // UploadedDocuments + business-level BusinessDocuments).
    const enriched = await Promise.all(finalData.map((req: any) => this.attachDocuments(req)));

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approve(adminId: string, tenantId: string, id: string, dto: ApproveOnboardingDto) {
    const defaultTenant = await this.db.tenant.findUnique({
      where: { slug: 'default' },
    });
    const isDefaultPlatformAdmin = defaultTenant && defaultTenant.id === tenantId;

    const request = await this.db.verificationRequest.findFirst({
      where: isDefaultPlatformAdmin ? { id } : { id, tenantId },
      include: { entity: true },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    if (request.status === 'APPROVED') {
      throw new BadRequestException('Verification request is already approved');
    }

    const requestTenantId = request.tenantId;
    const now = new Date();

    // 1. Update verification request fields
    const updatedRequest = await this.db.verificationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        verifiedBy: adminId,
        verifiedAt: now,
        moderationNotes: dto.notes,
      },
    });

    // 2. Update entity fields
    await this.db.entity.update({
      where: { id: request.entityId },
      data: { status: 'APPROVED' },
    });

    // 3. Update specialized profiles if business
    if (request.entity.type === 'BUSINESS') {
      const business = await this.db.business.findFirst({
        where: { entityId: request.entityId },
      });

      if (business) {
        await this.db.business.update({
          where: { id: business.id },
          data: {
            status: 'APPROVED',
            isVerified: true,
            verifiedAt: now,
          },
        });

        // Mark this business's verification documents approved
        await this.db.businessDocument.updateMany({
          where: { businessId: business.id, status: 'PENDING' },
          data: { status: 'APPROVED' },
        });

        // Sync to Search index
        try {
          await this.searchService.indexBusiness(business.id, business.tenantId);
        } catch (err) {
          this.logger.warn(`Search indexing failed for business ${business.id}:`, err);
        }
      }
    }

    // 4. Update documents status to APPROVED
    await this.db.uploadedDocument.updateMany({
      where: { entityId: request.entityId, status: 'PENDING' },
      data: { status: 'APPROVED' },
    });

    // 5. Update onboarding progress status — progress may be stored under entity.id OR business.id
    const progressEntityIds = [request.entityId];
    if (request.entity.type === 'BUSINESS') {
      const biz = await this.db.business.findFirst({ where: { entityId: request.entityId }, select: { id: true } });
      if (biz) progressEntityIds.push(biz.id);
    }
    await this.db.onboardingProgress.updateMany({
      where: { entityId: { in: progressEntityIds } },
      data: { status: 'APPROVED' },
    });

    // 6. Track event
    await this.db.onboardingEvent.create({
      data: {
        tenantId: requestTenantId,
        entityType: request.entity.type.toString(),
        entityId: request.entityId,
        event: 'ONBOARDING_APPROVED',
        metadata: { adminNotes: dto.notes },
      },
    });

    // 7. Send notification
    await this.notifications.send({
      tenantId: requestTenantId,
      userId: request.entity.userId,
      title: 'Verification Approved',
      body: `Your profile for ${request.entity.name} has been verified and approved.`,
      type: 'ONBOARDING_APPROVED',
      priority: NotificationPriority.HIGH,
      metadata: { entityId: request.entityId },
    });

    // 8. Record admin action audit
    await this.db.adminAction.create({
      data: {
        tenantId: requestTenantId,
        adminId,
        actionType: 'APPROVE_ONBOARDING',
        targetType: request.entity.type.toString(),
        targetId: request.entityId,
        reason: dto.notes || 'Verification approved',
      },
    });

    await this.audit.log({
      tenantId: requestTenantId,
      userId: adminId,
      action: 'BUSINESS_ONBOARDING_APPROVED',
      resource: 'entity',
      resourceId: request.entityId,
      metadata: { notes: dto.notes },
    });

    return updatedRequest;
  }

  async reject(adminId: string, tenantId: string, id: string, dto: RejectOnboardingDto) {
    const defaultTenant = await this.db.tenant.findUnique({
      where: { slug: 'default' },
    });
    const isDefaultPlatformAdmin = defaultTenant && defaultTenant.id === tenantId;

    const request = await this.db.verificationRequest.findFirst({
      where: isDefaultPlatformAdmin ? { id } : { id, tenantId },
      include: { entity: true },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    const requestTenantId = request.tenantId;
    const now = new Date();

    // 1. Update verification request fields
    const updatedRequest = await this.db.verificationRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.reason,
        verifiedBy: adminId,
        verifiedAt: now,
      },
    });

    // 2. Update entity fields
    await this.db.entity.update({
      where: { id: request.entityId },
      data: { status: 'REJECTED' },
    });

    // 3. Update specialized profile if business
    if (request.entity.type === 'BUSINESS') {
      const business = await this.db.business.findFirst({
        where: { entityId: request.entityId },
      });

      if (business) {
        await this.db.business.update({
          where: { id: business.id },
          data: { status: 'REJECTED' },
        });

        // Mark this business's verification documents rejected
        await this.db.businessDocument.updateMany({
          where: { businessId: business.id, status: 'PENDING' },
          data: { status: 'REJECTED', rejectionReason: dto.reason },
        });

        // Remove from index if exists
        try {
          await this.searchService.removeFromIndex(business.id, business.tenantId);
        } catch (err) {
          this.logger.warn(`Failed to remove business ${business.id} from index:`, err);
        }
      }
    }

    // 4. Update documents status to REJECTED
    await this.db.uploadedDocument.updateMany({
      where: { entityId: request.entityId, status: 'PENDING' },
      data: { status: 'REJECTED', rejectionReason: dto.reason },
    });

    // 5. Update onboarding progress status — progress may be stored under entity.id OR business.id
    const progressEntityIds = [request.entityId];
    if (request.entity.type === 'BUSINESS') {
      const biz = await this.db.business.findFirst({ where: { entityId: request.entityId }, select: { id: true } });
      if (biz) progressEntityIds.push(biz.id);
    }
    await this.db.onboardingProgress.updateMany({
      where: { entityId: { in: progressEntityIds } },
      data: { status: 'REJECTED' },
    });

    // 6. Track event
    await this.db.onboardingEvent.create({
      data: {
        tenantId: requestTenantId,
        entityType: request.entity.type.toString(),
        entityId: request.entityId,
        event: 'ONBOARDING_REJECTED',
        metadata: { reason: dto.reason },
      },
    });

    // 7. Send notification
    await this.notifications.send({
      tenantId: requestTenantId,
      userId: request.entity.userId,
      title: 'Verification Rejected',
      body: `Your verification request needs changes: ${dto.reason}`,
      type: 'ONBOARDING_REJECTED',
      priority: NotificationPriority.HIGH,
      metadata: { entityId: request.entityId, reason: dto.reason },
    });

    // 8. Record admin action audit
    await this.db.adminAction.create({
      data: {
        tenantId: requestTenantId,
        adminId,
        actionType: 'REJECT_ONBOARDING',
        targetType: request.entity.type.toString(),
        targetId: request.entityId,
        reason: dto.reason,
      },
    });

    await this.audit.log({
      tenantId: requestTenantId,
      userId: adminId,
      action: 'BUSINESS_ONBOARDING_REJECTED',
      resource: 'entity',
      resourceId: request.entityId,
      metadata: { reason: dto.reason },
    });

    return updatedRequest;
  }
}
