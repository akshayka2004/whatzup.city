import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import {
  AssignPackageDto, AssignHotelPackageDto, PackageNameEnum, ACTIVE_PACKAGES,
} from './dto/subscription.dto';

// Mirrors apps/web/lib/hotel-pricing.ts — keep both in sync.
const HOTEL_STAR_PRICING: Record<number, number> = { 5: 15000, 4: 12500, 3: 10000, 2: 7500, 1: 5000 };
const HOTEL_ADDON_PRICE = 2500;

/** Standard packages are billed per quarter. */
export const PLAN_DURATION_DAYS = 90;
/**
 * Hotels are billed annually: star classification is a yearly slab charge and
 * amenity/category listings are yearly, per the client pricing sheet.
 */
export const HOTEL_DURATION_DAYS = 365;

/** GST added on top of every plan/hotel base price. Mirrors apps/web/lib/subscription-plans.ts. */
export const TAX_PERCENT = 18;

export function withTax(base: number) {
  const b = Math.max(0, Math.round(base));
  const tax = Math.round((b * TAX_PERCENT) / 100);
  return { base: b, tax, total: b + tax };
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Supersede every non-final subscription a business has (ACTIVE and
   * PENDING_PAYMENT) before creating a new one, and auto-fail any PENDING
   * payment still pointing at the rows just superseded.
   *
   * Without the payment cleanup, a business that retries (rejected, or just
   * resubmits) leaves an old payment sitting in the admin queue next to the
   * new one. If an admin verifies the wrong one, verifyPayment's
   * `if (payment.subscriptionId) subscription.update(...ACTIVE)` would
   * resurrect the subscription this method just expired.
   */
  private async supersedeSubscriptions(tenantId: string, businessId: string) {
    const stale = await this.db.subscription.findMany({
      where: { tenantId, businessId, status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
      select: { id: true },
    });
    if (stale.length === 0) return;
    const staleIds = stale.map((s) => s.id);

    await this.db.subscription.updateMany({
      where: { id: { in: staleIds } },
      data: { status: 'EXPIRED' },
    });

    await this.db.payment.updateMany({
      where: { subscriptionId: { in: staleIds }, status: 'PENDING' },
      data: { status: 'FAILED', rejectionReason: 'Superseded by a newer payment attempt' },
    });
  }

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
    if (!packageConfig) throw new BadRequestException('Unknown package');

    // Duration is server-controlled — never taken from the client.
    const duration = PLAN_DURATION_DAYS;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration);

    await this.supersedeSubscriptions(tenantId, businessId);

    const subscription = await this.db.subscription.create({
      data: {
        tenantId,
        businessId,
        packageName: dto.packageName,
        pricing: withTax(packageConfig.pricing).total,
        duration,
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

  /**
   * Hotel category only. Star classification replaces normal package
   * selection: computes base + recurring per-amenity charge server-side
   * (never trusts client-sent price), persists the classification onto the
   * business, and creates the Subscription directly (planId stays null).
   */
  async assignHotelPackage(userId: string, tenantId: string, businessId: string, dto: AssignHotelPackageDto) {
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id: businessId }, { entityId: businessId }] },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    businessId = business.id;

    const starBase = HOTEL_STAR_PRICING[dto.starRating];
    if (!starBase) throw new BadRequestException('Invalid star rating');
    const selectedCount = Object.values(dto.amenities || {}).filter((a) => a?.selected).length;
    // GST applies to the combined star + amenities base, same as the plans.
    const totals = withTax(starBase + selectedCount * HOTEL_ADDON_PRICE);
    const pricing = totals.total;

    // Hotels are billed annually, unlike the quarterly standard packages.
    const duration = HOTEL_DURATION_DAYS;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration);

    await this.db.business.update({
      where: { id: businessId },
      data: { hotelStarRating: dto.starRating, hotelAmenities: dto.amenities || {} },
    });

    // Same supersession as assignPackage — see supersedeSubscriptions().
    await this.supersedeSubscriptions(tenantId, businessId);

    const subscription = await this.db.subscription.create({
      data: {
        tenantId,
        businessId,
        planId: null,
        packageName: `HOTEL_${dto.starRating}STAR`,
        pricing,
        duration,
        featureFlags: { hotelListing: true, amenityCount: selectedCount },
        postingLimits: 50,
        categoryLimits: 1,
        status: 'PENDING_PAYMENT',
        startDate,
        endDate,
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'SUBSCRIPTION_SELECTED',
      resource: 'SUBSCRIPTION',
      resourceId: subscription.id,
      metadata: { packageName: subscription.packageName, price: pricing, starRating: dto.starRating, selectedCount },
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
        // Legacy auto-assigned packages don't count as a paid plan, so those
        // businesses are treated as unpaid and prompted to choose one.
        OR: [
          { packageName: { in: ACTIVE_PACKAGES } },
          { packageName: { startsWith: 'HOTEL_' } },
        ],
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

  /**
   * Admin subscriber list, straight from the Subscription table across all
   * tenants (subscriptions live in each business's own tenant). Includes the
   * latest payment so the admin sees what was actually paid.
   */
  async listAllForAdmin() {
    // tenant-scope-ok: admin subscriber list spans tenants by design; role-guarded in controller
    const subs = await this.db.subscription.findMany({
      // Legacy rows (LISTING_BASIC etc.) were auto-assigned by the old
      // registration flow without the business ever choosing or paying, so they
      // are excluded — those businesses count as having no plan.
      where: {
        deletedAt: null,
        OR: [
          { packageName: { in: ACTIVE_PACKAGES } },
          { packageName: { startsWith: 'HOTEL_' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            status: true,
            createdAt: true,
            category: { select: { name: true, slug: true } },
            payments: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true, amount: true, status: true, method: true,
                transactionRef: true, createdAt: true, verifiedAt: true,
              },
            },
          },
        },
      },
      take: 500,
    });

    return subs.map((s) => ({
      ...s,
      latestPayment: s.business?.payments?.[0] ?? null,
    }));
  }

  async getPackages() {
    // Only the current plans — retired ones stay in the enum for existing rows.
    return ACTIVE_PACKAGES.map((name) => {
      const config = this.getPackageConfig(name);
      return {
        name,
        price: config.pricing,
        mrp: config.mrp,
        durationDays: PLAN_DURATION_DAYS,
        postingLimits: config.postingLimits,
        categoryLimits: config.categoryLimits,
        featureFlags: config.featureFlags,
        features: config.features,
      };
    });
  }

  private getPackageConfig(packageName: PackageNameEnum) {
    const packages: Record<PackageNameEnum, any> = {
      // ── Current plans. `pricing` is the offer price (what we charge);
      //    `mrp` is shown struck through in the UI. Mirrors
      //    apps/web/lib/subscription-plans.ts — keep both in sync.
      [PackageNameEnum.WHTZUP]: {
        pricing: 1500,
        mrp: 2500,
        postingLimits: 1,
        categoryLimits: 1,
        featureFlags: { listingPackage: true, offers: 1, vouchers: 1 },
        features: ['Web App Listing', 'Website Listing (information only)', 'No backlinks'],
      },
      [PackageNameEnum.WHTZUP_PLUS]: {
        pricing: 2500,
        mrp: 5000,
        postingLimits: 3,
        categoryLimits: 1,
        featureFlags: { listingPackage: true, offers: 3, vouchers: 3 },
        features: ['Web App Listing', 'Website Listing (information only)', 'No backlinks'],
      },
      [PackageNameEnum.WHTZUP_X]: {
        pricing: 5000,
        mrp: 10000,
        postingLimits: 5,
        categoryLimits: 1,
        featureFlags: { listingPackage: true, backlinks: true, offers: 5, vouchers: 5 },
        features: ['Web App Listing', 'Website Listing with backlinks', 'Information only'],
      },
      [PackageNameEnum.WHTZUP_XL]: {
        pricing: 7500,
        mrp: 15000,
        postingLimits: 10,
        categoryLimits: 2,
        featureFlags: {
          listingPackage: true, backlinks: true, sponsoredPoster: true,
          whatsappCampaign: true, offers: 10, vouchers: 10,
        },
        features: [
          'Web App Listing',
          'Website Listing with backlinks',
          '1 Sponsored Category Landing Page poster image',
          'WhatsApp Channel Campaign — 1 poster/video per month',
        ],
      },
      [PackageNameEnum.WHTZUP_LUXE]: {
        pricing: 10000,
        mrp: 20000,
        postingLimits: 20,
        categoryLimits: 3,
        featureFlags: {
          listingPackage: true, backlinks: true, sponsoredPoster: true,
          sponsoredVideo: true, whatsappCampaign: true, offers: 20, vouchers: 20,
        },
        features: [
          'Web App Listing',
          'Website Listing with backlinks',
          'Sponsored Category Landing Page video (up to 60s) + poster image',
          'WhatsApp Channel Campaign — 1 poster & 1 video per week',
        ],
      },

      // ── Retired plans (not offered to new signups) ──────────────
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
