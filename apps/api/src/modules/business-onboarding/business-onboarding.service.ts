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

    // Create business in DRAFT status
    const business = await this.db.business.create({
      data: {
        tenantId,
        ownerId: userId,
        categoryId: category.id,
        name: dto.businessName,
        slug,
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        status: 'DRAFT',
        profileType: dto.profileType || 'OWNER',
        subcategoryIds: subcategories.map((category) => category.id),
        tags: [],
        socialLinks: {},
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
        entityId: business.id,
        currentStep: 1,
        status: 'DRAFT',
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
        entityId: business.id,
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
    const business = await this.db.business.findFirst({
      where: { id, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

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
        where: { tenantId, email: dto.businessEmail, deletedAt: null, NOT: { id } },
      });
      if (duplicateEmail) throw new ConflictException('Business email already registered');
    }

    if (dto.businessPhone && dto.businessPhone !== business.phone) {
      const duplicatePhone = await this.db.business.findFirst({
        where: { tenantId, phone: dto.businessPhone, deletedAt: null, NOT: { id } },
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
      where: { id },
      data: updateData,
    });

    // Update progress tracker
    const progress = await this.db.onboardingProgress.findFirst({
      where: { tenantId, entityType: 'BUSINESS', entityId: id },
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

    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: 'BUSINESS',
        entityId: id,
        event: `STEP_${step}_COMPLETED`,
        metadata: { step },
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'BUSINESS_ONBOARDING_UPDATE',
      resource: 'BUSINESS',
      resourceId: id,
      metadata: { step },
    });

    return updated;
  }

  async submitForVerification(userId: string, tenantId: string, id: string) {
    const business = await this.db.business.findFirst({
      where: { id, tenantId },
      include: {
        documents: true,
        media: true,
        subscriptions: true,
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    // Verification Completion Checks
    if (business.documents.length === 0) {
      throw new BadRequestException(
        'At least one business document must be uploaded for verification',
      );
    }
    if (business.media.length === 0) {
      throw new BadRequestException(
        'At least one media file (e.g. logo or banner) must be uploaded',
      );
    }
    if (business.subscriptions.length === 0) {
      throw new BadRequestException(
        'Active package subscription is required to complete onboarding',
      );
    }

    // Update business status
    const updated = await this.db.business.update({
      where: { id },
      data: { status: 'PENDING_VERIFICATION' },
    });

    await this.db.onboardingProgress.updateMany({
      where: { tenantId, entityType: 'BUSINESS', entityId: id },
      data: {
        currentStep: 6,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Create a official Verification Request ticket in system
    await this.db.businessVerification.create({
      data: {
        tenantId,
        businessId: id,
        status: 'PENDING',
      },
    });

    // Record Onboarding complete/submitted event
    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: 'BUSINESS',
        entityId: id,
        event: 'BUSINESS_SUBMITTED_VERIFICATION',
      },
    });

    // Dispatch queue job for verification notifications & indexing preparation
    await this.onboardingQueue.add('process-business-verification', {
      businessId: id,
      tenantId,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'BUSINESS_SUBMIT_VERIFICATION',
      resource: 'BUSINESS',
      resourceId: id,
    });

    return {
      message: 'Business successfully submitted to the verification queue.',
      business: updated,
    };
  }

  async getProgress(userId: string, tenantId: string, id: string) {
    const business = await this.db.business.findFirst({
      where: { id, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const progress = await this.db.onboardingProgress.findFirst({
      where: { tenantId, entityType: 'BUSINESS', entityId: id },
    });

    return { business, onboardingProgress: progress };
  }
}
