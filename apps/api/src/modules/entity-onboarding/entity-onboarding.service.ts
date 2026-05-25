import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import { UpdateOnboardingStepDto, UploadEntityDocumentDto } from './dto/entity-onboarding.dto';

@Injectable()
export class EntityOnboardingService {
  private readonly logger = new Logger(EntityOnboardingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly mediaService: MediaService,
  ) {}

  private async getEntityAndVerifyOwner(userId: string, tenantId: string, entityId: string) {
    const entity = await this.db.entity.findFirst({
      where: { id: entityId, tenantId },
      include: {
        influencerProfile: true,
        professionalProfile: true,
        eventOrganizerProfile: true,
        organizationProfile: true,
        governmentProfile: true,
        business: true,
      },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    if (entity.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this entity onboarding');
    }

    return entity;
  }

  async getProgress(userId: string, tenantId: string, entityId: string) {
    const entity = await this.getEntityAndVerifyOwner(userId, tenantId, entityId);

    // Progress may be stored under entity.id (entity-onboarding flow)
    // OR under business.id (business-onboarding flow where entityId = business.id)
    const candidateIds = [entityId];
    if ((entity as any).business?.id) candidateIds.push((entity as any).business.id);

    const progress = await this.db.onboardingProgress.findFirst({
      where: { tenantId, entityId: { in: candidateIds } },
    });

    return { entity, onboardingProgress: progress };
  }

  async updateStep(
    userId: string,
    tenantId: string,
    entityId: string,
    step: number,
    dto: UpdateOnboardingStepDto,
  ) {
    const entity = await this.getEntityAndVerifyOwner(userId, tenantId, entityId);

    if (entity.status === 'APPROVED' || entity.status === 'PENDING_VERIFICATION') {
      throw new BadRequestException(`Cannot update onboarding details when status is ${entity.status}`);
    }

    const type = entity.type;
    const updateData: any = {};
    const entityUpdate: any = {};

    // Populate entity fields if present
    if (dto.metadata?.name || dto.organizationName || dto.ngoName || dto.departmentName) {
      entityUpdate.name = dto.organizationName || dto.ngoName || dto.departmentName || dto.metadata?.name;
    }
    if (dto.officialEmail) {
      entityUpdate.email = dto.officialEmail;
    }

    // Process profile-specific updates
    await this.db.$transaction(async (tx) => {
      if (type === 'INFLUENCER') {
        const influencerData: any = {};
        if (dto.niche !== undefined) influencerData.niche = dto.niche;
        if (dto.instagram !== undefined) influencerData.instagram = dto.instagram;
        if (dto.youtube !== undefined) influencerData.youtube = dto.youtube;
        if (dto.facebook !== undefined) influencerData.facebook = dto.facebook;
        if (dto.linkedin !== undefined) influencerData.linkedin = dto.linkedin;
        if (dto.followersCount !== undefined) influencerData.followersCount = dto.followersCount;
        if (dto.engagementRate !== undefined) influencerData.engagementRate = dto.engagementRate;
        if (dto.portfolioUrl !== undefined) influencerData.portfolioUrl = dto.portfolioUrl;
        if (dto.mediaKitUrl !== undefined) influencerData.mediaKitUrl = dto.mediaKitUrl;

        await tx.influencerProfile.update({
          where: { entityId },
          data: influencerData,
        });
      } else if (type === 'PROFESSIONAL') {
        const professionalData: any = {};
        if (dto.category !== undefined) professionalData.category = dto.category;
        if (dto.experienceYears !== undefined) professionalData.experienceYears = dto.experienceYears;
        if (dto.certifications !== undefined) professionalData.certifications = dto.certifications;
        if (dto.serviceAreas !== undefined) professionalData.serviceAreas = dto.serviceAreas;
        if (dto.pricingMin !== undefined) professionalData.pricingMin = dto.pricingMin;
        if (dto.pricingMax !== undefined) professionalData.pricingMax = dto.pricingMax;
        if (dto.availability !== undefined) professionalData.availability = dto.availability;

        await tx.professionalProfile.update({
          where: { entityId },
          data: professionalData,
        });
      } else if (type === 'EVENT_ORGANIZER') {
        const eventOrganizerData: any = {};
        if (dto.organizationName !== undefined) eventOrganizerData.organizationName = dto.organizationName;
        if (dto.eventCategories !== undefined) eventOrganizerData.eventCategories = dto.eventCategories;
        if (dto.venuePartnerships !== undefined) eventOrganizerData.venuePartnerships = dto.venuePartnerships;
        if (dto.ticketingSupport !== undefined) eventOrganizerData.ticketingSupport = dto.ticketingSupport;
        if (dto.website !== undefined) eventOrganizerData.website = dto.website;
        if (dto.socialLinks !== undefined) eventOrganizerData.socialLinks = dto.socialLinks;
        if (dto.previousEvents !== undefined) eventOrganizerData.previousEvents = dto.previousEvents;

        await tx.eventOrganizerProfile.update({
          where: { entityId },
          data: eventOrganizerData,
        });
      } else if (type === 'ORGANIZATION') {
        const organizationData: any = {};
        if (dto.ngoName !== undefined) organizationData.ngoName = dto.ngoName;
        if (dto.registrationNumber !== undefined) organizationData.registrationNumber = dto.registrationNumber;
        if (dto.causeCategory !== undefined) organizationData.causeCategory = dto.causeCategory;
        if (dto.operationalAreas !== undefined) organizationData.operationalAreas = dto.operationalAreas;
        if (dto.website !== undefined) organizationData.website = dto.website;
        if (dto.socialLinks !== undefined) organizationData.socialLinks = dto.socialLinks;

        await tx.organizationProfile.update({
          where: { entityId },
          data: organizationData,
        });
      } else if (type === 'GOVERNMENT') {
        const governmentData: any = {};
        if (dto.departmentName !== undefined) governmentData.departmentName = dto.departmentName;
        if (dto.officialEmail !== undefined) governmentData.officialEmail = dto.officialEmail;
        if (dto.departmentType !== undefined) governmentData.departmentType = dto.departmentType;
        if (dto.district !== undefined) governmentData.district = dto.district;

        await tx.governmentProfile.update({
          where: { entityId },
          data: governmentData,
        });
      }

      // Update parent Entity if name/email changed
      if (Object.keys(entityUpdate).length > 0) {
        await tx.entity.update({
          where: { id: entityId },
          data: entityUpdate,
        });
      }

      // Update onboarding progress tracker
      const progress = await tx.onboardingProgress.findFirst({
        where: { tenantId, entityId },
      });

      if (progress) {
        const steps = Array.isArray(progress.stepsCompleted)
          ? (progress.stepsCompleted as string[])
          : JSON.parse(progress.stepsCompleted as string || '[]');

        const stepName = `STEP_${step}`;
        if (!steps.includes(stepName)) {
          steps.push(stepName);
        }

        await tx.onboardingProgress.update({
          where: { id: progress.id },
          data: {
            currentStep: step + 1,
            stepsCompleted: steps,
            metadata: {
              ...((progress.metadata as object) || {}),
              ...dto,
            },
          },
        });
      }

      // Create onboarding event
      await tx.onboardingEvent.create({
        data: {
          tenantId,
          entityType: type.toString(),
          entityId,
          event: `STEP_${step}_COMPLETED`,
          metadata: { step },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'UPDATE',
          resource: `entity_${type.toLowerCase()}_profile`,
          resourceId: entityId,
          metadata: { step },
        },
      });
    });

    // Clear user cache
    await this.redis.del(`user:${userId}`);

    return this.getProgress(userId, tenantId, entityId);
  }

  async getSignedUploadUrl(
    userId: string,
    tenantId: string,
    entityId: string,
    filename: string,
    mimeType: string,
  ) {
    await this.getEntityAndVerifyOwner(userId, tenantId, entityId);

    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException('File must be a PDF or image file (jpg, png, webp)');
    }

    // Generate signed upload URL from MediaService, using entityId in place of businessId
    return this.mediaService.getSignedUploadUrl(tenantId, entityId, filename, mimeType);
  }

  async attachDocument(
    userId: string,
    tenantId: string,
    entityId: string,
    dto: UploadEntityDocumentDto,
  ) {
    const entity = await this.getEntityAndVerifyOwner(userId, tenantId, entityId);

    if (dto.documentNumber) {
      const existingDocument = await this.db.uploadedDocument.findFirst({
        where: {
          tenantId,
          entityId,
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
        },
      });
      if (existingDocument) {
        throw new BadRequestException('This document number has already been uploaded for this entity');
      }
    }

    // Save document record to DB
    const document = await this.db.uploadedDocument.create({
      data: {
        tenantId,
        entityId,
        documentType: dto.documentType,
        fileUrl: dto.fileUrl,
        status: 'PENDING',
        documentNumber: dto.documentNumber,
        issuedAuthority: dto.issuedAuthority,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });

    // Create onboarding event
    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: entity.type.toString(),
        entityId,
        event: 'DOCUMENT_UPLOADED',
        metadata: { documentId: document.id, documentType: dto.documentType },
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_UPLOAD_REQUEST',
      resource: 'UPLOADED_DOCUMENT',
      resourceId: document.id,
      metadata: { documentType: dto.documentType },
    });

    return document;
  }

  async getDocuments(userId: string, tenantId: string, entityId: string) {
    await this.getEntityAndVerifyOwner(userId, tenantId, entityId);
    return this.db.uploadedDocument.findMany({
      where: { tenantId, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(userId: string, tenantId: string, entityId: string, documentId: string) {
    await this.getEntityAndVerifyOwner(userId, tenantId, entityId);

    const document = await this.db.uploadedDocument.findFirst({
      where: { id: documentId, entityId, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.db.uploadedDocument.delete({
      where: { id: documentId },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_DELETE',
      resource: 'UPLOADED_DOCUMENT',
      resourceId: documentId,
    });

    return { message: 'Document deleted successfully' };
  }

  async submitForVerification(userId: string, tenantId: string, entityId: string) {
    const entity = await this.getEntityAndVerifyOwner(userId, tenantId, entityId);

    if (entity.status === 'APPROVED' || entity.status === 'PENDING_VERIFICATION') {
      throw new BadRequestException(`Entity is already ${entity.status}`);
    }

    // Verify at least one document is uploaded
    const documentCount = await this.db.uploadedDocument.count({
      where: { entityId, tenantId },
    });

    if (documentCount === 0) {
      throw new BadRequestException('At least one verification document must be uploaded to complete onboarding');
    }

    await this.db.$transaction(async (tx) => {
      // Update entity status
      await tx.entity.update({
        where: { id: entityId },
        data: { status: 'PENDING_VERIFICATION' },
      });

      // Update onboarding progress
      await tx.onboardingProgress.updateMany({
        where: { tenantId, entityId },
        data: { status: 'PENDING_VERIFICATION' },
      });

      // Create Verification Request ticket
      await tx.verificationRequest.create({
        data: {
          tenantId,
          entityId,
          status: 'PENDING',
        },
      });

      // Create onboarding event
      await tx.onboardingEvent.create({
        data: {
          tenantId,
          entityType: entity.type.toString(),
          entityId,
          event: 'ENTITY_SUBMITTED_VERIFICATION',
        },
      });

      // Log audit activity
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'VERIFY',
          resource: 'entity',
          resourceId: entityId,
          metadata: { status: 'PENDING_VERIFICATION' },
        },
      });
    });

    // Clear cache
    await this.redis.del(`user:${userId}`);

    return {
      message: 'Onboarding verification request successfully submitted.',
      status: 'PENDING_VERIFICATION',
    };
  }
}
