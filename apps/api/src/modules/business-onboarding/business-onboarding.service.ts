import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { SearchService } from '../search/search.service';
import {
  StartBusinessOnboardingDto,
  UpdateBusinessDetailsDto,
} from './dto/business-onboarding.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BusinessOnboardingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly searchService: SearchService,
    @InjectQueue('onboarding-queue') private readonly onboardingQueue: Queue,
  ) {}

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36)
    );
  }

  async startOnboarding(userId: string, tenantId: string, dto: StartBusinessOnboardingDto) {
    const slug = this.generateSlug(dto.businessName);

    // Verify category exists
    const category = await this.db.category.findFirst({
      where: { tenantId, slug: dto.categorySlug, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException(`Category ${dto.categorySlug} not found`);
    }

    const duplicateName = await this.db.business.findFirst({
      where: {
        tenantId,
        name: { equals: dto.businessName, mode: 'insensitive' },
        ownerId: userId,
        deletedAt: null,
      },
    });
    if (duplicateName) {
      throw new ConflictException('A draft for this business already exists');
    }

    const subcategories = dto.subcategorySlugs?.length
      ? await this.db.category.findMany({
          where: {
            tenantId,
            slug: { in: dto.subcategorySlugs },
            deletedAt: null,
          },
          select: { id: true, slug: true },
        })
      : [];

    // Create Entity first so VerificationRequest can attach immediately.
    const entity = await this.db.entity.create({
      data: {
        tenantId,
        userId,
        type: 'BUSINESS' as any,
        status: 'PENDING_VERIFICATION' as any,
        name: dto.businessName,
      },
    });

    // Create business immediately in PENDING_VERIFICATION so it appears
    // in admin review queue. Owner can still edit details afterwards.
    const business = await this.db.business.create({
      data: {
        tenantId,
        ownerId: userId,
        categoryId: category.id,
        entityId: entity.id,
        name: dto.businessName,
        slug,
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        status: 'PENDING_VERIFICATION',
        isVerified: false,
        profileType: dto.profileType || 'OWNER',
        subcategoryIds: subcategories.map((category) => category.id),
        tags: [],
        socialLinks: {},
      },
    });

    // Index business immediately
    await this.searchService.indexBusiness(business.id, tenantId);

    // VerificationRequest — admin moderation queue source
    await this.db.verificationRequest.create({
      data: {
        tenantId,
        entityId: entity.id,
        status: 'PENDING',
      },
    });

    // Create staff connection as OWNER
    // Map BusinessProfileType → BusinessMemberRole
    const memberRole = dto.profileType === 'STAFF' ? 'STAFF' : 'OWNER';
    await this.db.businessStaff.create({
      data: {
        tenantId,
        businessId: business.id,
        userId,
        role: memberRole as any,
      },
    });

    // Onboarding progress
    const progress = await this.db.onboardingProgress.create({
      data: {
        tenantId,
        entityType: 'BUSINESS',
        entityId: entity.id,
        currentStep: 1,
        status: 'PENDING_VERIFICATION',
        stepsCompleted: ['START'],
        metadata: {
          categoryName: category.name,
          categorySlug: category.slug,
          subcategories,
          profileType: dto.profileType || 'OWNER',
        },
      },
    });

    // Track onboarding start event
    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: 'BUSINESS',
        entityId: entity.id,
        event: 'BUSINESS_ONBOARDING_STARTED',
        metadata: { step: 1 },
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'BUSINESS_ONBOARDING_START',
      resource: 'BUSINESS',
      resourceId: business.id,
    });

    return { business, onboardingProgress: progress };
  }

  async updateStep(
    userId: string,
    tenantId: string,
    id: string,
    step: number,
    dto: UpdateBusinessDetailsDto,
  ) {
    // Accept either business.id or entity.id (entity.id is stored in JWT and used in redirects)
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id }, { entityId: id }] },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    const actualId = business.id;

    const updateData: any = {};
    if (dto.businessDescription !== undefined) updateData.description = dto.businessDescription;
    if (dto.ownerName !== undefined) updateData.ownerName = dto.ownerName;
    if (dto.businessEmail !== undefined) updateData.email = dto.businessEmail;
    if (dto.businessPhone !== undefined) updateData.phone = dto.businessPhone;
    if (dto.businessWebsite !== undefined) updateData.website = dto.businessWebsite;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.district !== undefined) updateData.district = dto.district;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.postalCode !== undefined) updateData.zipCode = dto.postalCode;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.operatingHours !== undefined) updateData.operatingHours = dto.operatingHours;
    if (dto.googleMapsUrl !== undefined) updateData.googleMapsUrl = dto.googleMapsUrl;
    if (dto.socialLinks !== undefined) updateData.socialLinks = dto.socialLinks;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    if (dto.businessEmail && dto.businessEmail !== business.email) {
      const duplicateEmail = await this.db.business.findFirst({
        where: { tenantId, email: dto.businessEmail, deletedAt: null, NOT: { id: actualId } },
      });
      if (duplicateEmail) throw new ConflictException('Business email already registered');
    }

    if (dto.businessPhone && dto.businessPhone !== business.phone) {
      const duplicatePhone = await this.db.business.findFirst({
        where: { tenantId, phone: dto.businessPhone, deletedAt: null, NOT: { id: actualId } },
      });
      if (duplicatePhone) throw new ConflictException('Business phone already registered');
    }

    let subcategories: Array<{ id: string; slug: string }> | undefined;
    if (dto.subcategorySlugs?.length) {
      subcategories = await this.db.category.findMany({
        where: { tenantId, slug: { in: dto.subcategorySlugs }, deletedAt: null },
        select: { id: true, slug: true },
      });
      updateData.subcategoryIds = subcategories.map((category) => category.id);
    }

    // Save tags, socialLinks, maps url into metadata/custom fields
    const updatedMetadata: any = {};
    if (dto.googleMapsUrl) updatedMetadata.googleMapsUrl = dto.googleMapsUrl;
    if (dto.socialLinks) updatedMetadata.socialLinks = dto.socialLinks;
    if (dto.tags) updatedMetadata.tags = dto.tags;
    if (subcategories) updatedMetadata.subcategories = subcategories;

    const updated = await this.db.business.update({
      where: { id: actualId },
      data: updateData,
    });

    await this.searchService.indexBusiness(actualId, tenantId);

    // Update progress tracker
    const progress = await this.db.onboardingProgress.findFirst({
      where: { tenantId, entityType: 'BUSINESS', entityId: business.entityId || actualId },
    });

    if (progress) {
      const steps = Array.isArray(progress.stepsCompleted)
        ? (progress.stepsCompleted as string[])
        : JSON.parse(progress.stepsCompleted as string);
      const stepName = `STEP_${step}`;
      if (!steps.includes(stepName)) {
        steps.push(stepName);
      }

      await this.db.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          currentStep: step + 1,
          stepsCompleted: steps,
          metadata: {
            ...((progress.metadata as object) || {}),
            ...updatedMetadata,
          },
        },
      });
    }

    let eventEntityId = business.entityId;
    if (!eventEntityId) {
      const entity = await this.db.entity.create({
        data: {
          tenantId,
          userId,
          type: 'BUSINESS' as any,
          status: 'DRAFT',
          name: business.name,
          email: business.email || null,
          phone: business.phone || null,
        },
      });
      await this.db.business.update({
        where: { id: actualId },
        data: { entityId: entity.id },
      });
      eventEntityId = entity.id;
    }

    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: 'BUSINESS',
        entityId: eventEntityId,
        event: `STEP_${step}_COMPLETED`,
        metadata: { step },
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'BUSINESS_ONBOARDING_UPDATE',
      resource: 'BUSINESS',
      resourceId: actualId,
      metadata: { step },
    });

    return updated;
  }

  async submitForVerification(userId: string, tenantId: string, id: string) {
    // Accept either business.id or entity.id
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id }, { entityId: id }] },
      include: {
        documents: true,
        media: true,
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    const actualId = business.id;

    // Update business status
    const updated = await this.db.business.update({
      where: { id: actualId },
      data: { status: 'PENDING_VERIFICATION' },
    });

    await this.searchService.indexBusiness(actualId, tenantId);

    // ── Ensure unified Entity record exists for admin moderation queue ──────
    // Business registrations via business-onboarding may not have an Entity.
    // We create one here so the OnboardingVerificationService (admin panel)
    // can see this submission via the entity_verification_requests table.
    let entityId = business.entityId;

    if (!entityId) {
      const entity = await this.db.entity.create({
        data: {
          tenantId,
          userId,
          type: 'BUSINESS' as any,
          status: 'PENDING_VERIFICATION' as any,
          name: business.name,
          email: business.email || null,
          phone: business.phone || null,
        },
      });
      // Link entity back to business
      await this.db.business.update({
        where: { id: actualId },
        data: { entityId: entity.id },
      });
      entityId = entity.id;
    } else {
      // Sync status on existing entity
      await this.db.entity.update({
        where: { id: entityId },
        data: { status: 'PENDING_VERIFICATION' as any },
      });
    }

    const finalEntityId = entityId as string;

    await this.db.onboardingProgress.updateMany({
      where: { tenantId, entityType: 'BUSINESS', entityId: finalEntityId },
      data: {
        currentStep: 6,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Prevent duplicate verification requests
    const existingRequest = await this.db.verificationRequest.findFirst({
      where: { entityId: finalEntityId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    });
    if (!existingRequest) {
      await this.db.verificationRequest.create({
        data: { tenantId, entityId: finalEntityId, status: 'PENDING' },
      });
    }

    // Legacy businessVerification record — kept for backward compatibility
    const existingBizVerification = await this.db.businessVerification.findFirst({
      where: { businessId: actualId, status: 'PENDING' },
    });
    if (!existingBizVerification) {
      await this.db.businessVerification.create({
        data: { tenantId, businessId: actualId, status: 'PENDING' },
      });
    }

    // Record Onboarding complete/submitted event
    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: 'BUSINESS',
        entityId: finalEntityId,
        event: 'BUSINESS_SUBMITTED_VERIFICATION',
      },
    });

    // Dispatch queue job for verification notifications & indexing preparation
    await this.onboardingQueue.add('process-business-verification', {
      businessId: actualId,
      tenantId,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'BUSINESS_SUBMIT_VERIFICATION',
      resource: 'BUSINESS',
      resourceId: actualId,
    });

    return {
      message: 'Business successfully submitted to the verification queue.',
      business: updated,
    };
  }

  async getProgress(userId: string, tenantId: string, id: string) {
    // Accept either business.id or entity.id
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id }, { entityId: id }] },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const progress = await this.db.onboardingProgress.findFirst({
      where: { tenantId, entityType: 'BUSINESS', entityId: business.entityId || business.id },
    });

    return { business, onboardingProgress: progress };
  }
}
