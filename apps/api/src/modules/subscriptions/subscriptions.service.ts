import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { AssignPackageDto, PackageNameEnum } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async assignPackage(userId: string, tenantId: string, businessId: string, dto: AssignPackageDto) {
    // Accept either business.id or entity.id — the onboarding resubmit flow
    // passes entityId, matching the other onboarding endpoints.
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id: businessId }, { entityId: businessId }] },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    businessId = business.id;

    const packageConfig = this.getPackageConfig(dto.packageName);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + dto.duration);

    // Deactivate previous active subscriptions for this business
    await this.db.subscription.updateMany({
      where: { tenantId, businessId, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });

    const subscription = await this.db.subscription.create({
      data: {
        tenantId,
        businessId,
        packageName: dto.packageName,
        pricing: packageConfig.pricing,
        duration: dto.duration,
        featureFlags: packageConfig.featureFlags,
        postingLimits: packageConfig.postingLimits,
        categoryLimits: packageConfig.categoryLimits,
        status: packageConfig.pricing === 0 ? 'ACTIVE' : 'PENDING_PAYMENT',
        startDate,
        endDate,
      },
    });

    // Update business featured field if featured is enabled
    if (
      dto.packageName === PackageNameEnum.FEATURED ||
      dto.packageName === PackageNameEnum.LISTING_PREMIUM ||
      dto.packageName === PackageNameEnum.ENTERPRISE
    ) {
      await this.db.business.update({
        where: { id: businessId },
        data: { featuredUntil: endDate },
      });
    }

    await this.audit.log({
      tenantId,
      userId,
      action: 'SUBSCRIPTION_SELECTED',
      resource: 'SUBSCRIPTION',
      resourceId: subscription.id,
      metadata: { packageName: dto.packageName, price: packageConfig.pricing },
    });

    return subscription;
  }

  async getActive(tenantId: string, businessId: string) {
    const active = await this.db.subscription.findFirst({
      where: {
        tenantId,
        businessId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
    });
    if (!active) {
      // Default to standard FREE tier
      return {
        packageName: 'FREE',
        postingLimits: 5,
        categoryLimits: 1,
        featureFlags: {},
        status: 'ACTIVE',
      };
    }
    return active;
  }

  async getPackages() {
    return Object.values(PackageNameEnum).map((name) => {
      const config = this.getPackageConfig(name);
      return {
        name,
        price: config.pricing,
        postingLimits: config.postingLimits,
        categoryLimits: config.categoryLimits,
        featureFlags: config.featureFlags,
        features: config.features,
      };
    });
  }

  private getPackageConfig(packageName: PackageNameEnum) {
    const packages: Record<PackageNameEnum, any> = {
      [PackageNameEnum.FREE]: {
        pricing: 0,
        postingLimits: 5,
        categoryLimits: 1,
        featureFlags: {},
        features: ['Basic Business Profile', 'Basic Discovery Search'],
      },
      [PackageNameEnum.LISTING_BASIC]: {
        pricing: 999,
        postingLimits: 15,
        categoryLimits: 1,
        featureFlags: { listingPackage: true },
        features: ['Standard Listing', 'Category Search Visibility'],
      },
      [PackageNameEnum.LISTING_PREMIUM]: {
        pricing: 2999,
        postingLimits: 50,
        categoryLimits: 3,
        featureFlags: { listingPackage: true, verifiedBadge: true },
        features: ['Premium Listing', 'Verified Badge', 'Priority Support'],
      },
      [PackageNameEnum.FEATURED]: {
        pricing: 4999,
        postingLimits: 75,
        categoryLimits: 3,
        featureFlags: { featured: true, topPlacement: true },
        features: ['Featured Placement', 'Top Search Boost'],
      },
      [PackageNameEnum.SOCIAL_HIGHLIGHT]: {
        pricing: 1999,
        postingLimits: 25,
        categoryLimits: 2,
        featureFlags: { socialHighlight: true },
        features: ['Social Highlight', 'Promotional Slots'],
      },
      [PackageNameEnum.MAGAZINE_LISTING]: {
        pricing: 6999,
        postingLimits: 100,
        categoryLimits: 4,
        featureFlags: { magazineListing: true },
        features: ['Magazine Listing', 'Editorial Queue Eligibility'],
      },
      [PackageNameEnum.ADVERTISEMENT]: {
        pricing: 8999,
        postingLimits: 150,
        categoryLimits: 5,
        featureFlags: { advertisement: true, customBanner: true },
        features: ['Advertisement Campaign', 'Custom Banner Placement'],
      },
      [PackageNameEnum.ENTERPRISE]: {
        pricing: 9999,
        postingLimits: 1000,
        categoryLimits: 10,
        featureFlags: {
          featured: true,
          socialHighlight: true,
          magazineListing: true,
          customBanner: true,
          enterpriseAnalytics: true,
        },
        features: ['Enterprise Listing', 'Promotional Video', 'Analytics Dashboard', 'API Access'],
      },
    };
    return packages[packageName];
  }
}
