import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuditService } from '../audit/audit.service';
import { SearchService } from '../search/search.service';
import {
  AddOutletDto,
  ConvertBrandDto,
  UpdateBrandDto,
  UpdateOutletDto,
} from './dto/brand.dto';

const SNOOZE_DAYS = 7;

function slugify(name: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
  );
}

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly search: SearchService,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Monitoring feed read by super-admin. A failed write must never fail the user's request. */
  async recordEvent(e: {
    tenantId: string;
    brandId: string;
    businessId?: string | null;
    actorId?: string | null;
    type: string;
    summary: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.db.brandEvent.create({
        data: {
          tenantId: e.tenantId,
          brandId: e.brandId,
          businessId: e.businessId ?? null,
          actorId: e.actorId ?? null,
          type: e.type,
          summary: e.summary.slice(0, 255),
          metadata: e.metadata ?? {},
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not record brand event ${e.type}: ${err?.message ?? err}`);
    }
  }

  private async ownedBrand(userId: string, brandId: string) {
    // tenant-scope-ok: ownership (ownerId) is the scope
    const brand = await this.db.brand.findFirst({ where: { id: brandId, ownerId: userId, deletedAt: null } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  private async assertBrandNameFree(name: string, exceptBrandId?: string) {
    // tenant-scope-ok: brand names are unique platform-wide; selects id only
    const dup = await this.db.brand.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
        ...(exceptBrandId ? { NOT: { id: exceptBrandId } } : {}),
      },
      select: { id: true },
    });
    if (dup) throw new ConflictException('A brand with this name is already registered');
  }

  private async afterBusinessChange(businessId: string, tenantId: string) {
    await this.redis.del(`business:${businessId}`);
    try {
      await this.search.indexBusiness(businessId, tenantId);
    } catch {
      /* non-fatal: the next profile save reindexes */
    }
  }

  // ── convert an existing business into a brand account ────────────────────

  async convert(userId: string, dto: ConvertBrandDto) {
    const business = await this.db.business.findFirst({
      where: { id: dto.businessId, ownerId: userId, deletedAt: null },
      select: { id: true, tenantId: true, name: true, status: true, brandId: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.brandId) throw new ConflictException('This business is already part of a brand account.');
    if (['REJECTED', 'ARCHIVED'].includes(business.status)) {
      throw new BadRequestException('This business cannot be converted in its current state.');
    }
    // tenant-scope-ok: ownerId is the scope
    const existing = await this.db.brand.findFirst({ where: { ownerId: userId, deletedAt: null }, select: { name: true } });
    if (existing) {
      throw new ConflictException(`You already have a brand account (${existing.name}). Add new outlets from the Outlets page.`);
    }

    const name = dto.brandName.trim();
    await this.assertBrandNameFree(name);
    const mode = dto.billSeriesMode;
    const prefix = mode === 'SHARED' ? (dto.billSeriesPrefix ?? '').trim() : null;

    const brand = await this.db.$transaction(async (tx) => {
      const b = await tx.brand.create({
        data: {
          tenantId: business.tenantId,
          ownerId: userId,
          name,
          slug: slugify(name),
          billSeriesMode: mode,
          billSeriesPrefix: prefix,
          createdBy: userId,
        },
      });
      await tx.business.update({
        where: { id: business.id },
        data: {
          brandId: b.id,
          isBrandHq: true,
          brandName: b.name,
          outletLabel: dto.outletLabel?.trim() || null,
          brandPromptStatus: null,
          brandPromptAt: null,
        },
      });
      // Pin the dashboard to this business: the "newest entity" default would otherwise jump to
      // whichever outlet is added next.
      await tx.user.update({ where: { id: userId }, data: { activeBusinessId: business.id } });
      return b;
    });

    await this.recordEvent({
      tenantId: business.tenantId,
      brandId: brand.id,
      businessId: business.id,
      actorId: userId,
      type: 'BRAND_CONVERTED',
      summary: `"${business.name}" converted to the brand account "${brand.name}"`,
      metadata: { billSeriesMode: mode },
    });
    this.audit.log({
      tenantId: business.tenantId,
      userId,
      action: 'BRAND_CONVERTED',
      resource: 'BRAND',
      resourceId: brand.id,
      metadata: { businessId: business.id, billSeriesMode: mode },
    });
    await this.redis.del(`user:${userId}`);
    await this.afterBusinessChange(business.id, business.tenantId);
    return brand;
  }

  /** "Not now" (ask again in 7 days) or "No, single business" (don't ask again) on the conversion prompt. */
  async promptResponse(userId: string, businessId: string, response: 'SNOOZE' | 'DECLINE') {
    const business = await this.db.business.findFirst({
      where: { id: businessId, ownerId: userId, deletedAt: null },
      select: { id: true, tenantId: true, brandId: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.brandId) return { ok: true };
    await this.db.business.update({
      where: { id: business.id },
      data: { brandPromptStatus: response === 'DECLINE' ? 'DECLINED' : 'SNOOZED', brandPromptAt: new Date() },
    });
    this.audit.log({
      tenantId: business.tenantId,
      userId,
      action: response === 'DECLINE' ? 'BRAND_PROMPT_DECLINED' : 'BRAND_PROMPT_SNOOZED',
      resource: 'BUSINESS',
      resourceId: business.id,
    });
    await this.redis.del(`business:${business.id}`);
    return { ok: true, snoozeDays: SNOOZE_DAYS };
  }

  // ── read ─────────────────────────────────────────────────────────────────

  /** The caller's brand with its outlets (status, plan, series), or null for a single business. */
  async getMine(userId: string) {
    // tenant-scope-ok: ownerId is the scope
    const brand = await this.db.brand.findFirst({
      where: { ownerId: userId, deletedAt: null },
      include: {
        businesses: {
          where: { deletedAt: null },
          orderBy: [{ isBrandHq: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            outletLabel: true,
            isBrandHq: true,
            status: true,
            city: true,
            logo: true,
            billSeriesPrefix: true,
            launchOfferClaimedAt: true,
            createdAt: true,
            category: { select: { name: true, slug: true } },
            subscriptions: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { packageName: true, status: true, endDate: true },
            },
          },
        },
      },
    });
    if (!brand) return null;
    const { businesses, ...rest } = brand;
    return {
      brand: rest,
      outlets: businesses.map(({ subscriptions, ...o }) => ({ ...o, subscription: subscriptions[0] ?? null })),
    };
  }

  /** Per-outlet counts for the brand overview: verified spend, pending bills, live offers. */
  async summary(userId: string, brandId: string) {
    await this.ownedBrand(userId, brandId);
    // tenant-scope-ok: brand outlets are the scope
    const ids = (await this.db.business.findMany({ where: { brandId, deletedAt: null }, select: { id: true } })).map((b) => b.id);
    const [spend, pending, offers] = await Promise.all([
      this.db.verifiedPurchase.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, deletedAt: null },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.db.billVerification.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, status: { in: ['PENDING', 'FLAGGED', 'ESCALATED'] } },
        _count: { _all: true },
      }),
      this.db.offer.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, status: 'ACTIVE', deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const byId: Record<string, { verifiedPurchases: number; verifiedSpend: number; pendingBills: number; activeOffers: number }> = {};
    for (const id of ids) byId[id] = { verifiedPurchases: 0, verifiedSpend: 0, pendingBills: 0, activeOffers: 0 };
    for (const r of spend) {
      byId[r.businessId].verifiedPurchases = r._count._all;
      byId[r.businessId].verifiedSpend = Number(r._sum.amount ?? 0);
    }
    for (const r of pending) if (r.businessId) byId[r.businessId].pendingBills = r._count._all;
    for (const r of offers) byId[r.businessId].activeOffers = r._count._all;
    return { outlets: byId };
  }

  async listEvents(userId: string, brandId: string, limit = 50) {
    await this.ownedBrand(userId, brandId);
    return this.db.brandEvent.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 50, 1), 100),
    });
  }

  /** Approved outlets of a brand, for the public "Other outlets" list. */
  async listPublicOutlets(brandId: string) {
    // tenant-scope-ok: public read, scoped to one brand and approved outlets only
    return this.db.business.findMany({
      where: { brandId, deletedAt: null, status: 'APPROVED' },
      orderBy: [{ isBrandHq: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, slug: true, outletLabel: true, city: true, district: true, logo: true },
    });
  }

  /** The HQ outlet's invoice details, decrypted, so a new outlet's invoice form can be pre-filled. */
  async billingDefaults(userId: string, brandId: string) {
    await this.ownedBrand(userId, brandId);
    // tenant-scope-ok: brand HQ is the scope
    const hq = await this.db.business.findFirst({
      where: { brandId, isBrandHq: true, deletedAt: null },
      select: { billingProfile: true },
    });
    const bp = hq?.billingProfile;
    if (!bp) return null;
    return {
      billingName: bp.billingName,
      hasGst: bp.hasGst,
      gstin: this.crypto.decrypt(bp.gstin),
      pan: this.crypto.decrypt(bp.pan),
      addressLine: bp.addressLine,
      city: bp.city,
      state: bp.state,
      pincode: bp.pincode,
      invoiceEmail: bp.invoiceEmail,
    };
  }

  // ── brand settings ───────────────────────────────────────────────────────

  async update(userId: string, brandId: string, dto: UpdateBrandDto) {
    const brand = await this.ownedBrand(userId, brandId);
    const data: Record<string, any> = {};
    const changes: Record<string, { from: any; to: any }> = {};

    if (dto.name !== undefined && dto.name.trim() !== brand.name) {
      const name = dto.name.trim();
      await this.assertBrandNameFree(name, brand.id);
      data.name = name;
      changes.name = { from: brand.name, to: name };
    }

    const nextMode = dto.billSeriesMode ?? brand.billSeriesMode;
    const nextPrefixRaw = dto.billSeriesPrefix !== undefined ? dto.billSeriesPrefix.trim() : brand.billSeriesPrefix ?? '';
    if (nextMode === 'SHARED' && !nextPrefixRaw) {
      throw new BadRequestException('Enter the bill series prefix your outlets share.');
    }
    if (nextMode !== brand.billSeriesMode) {
      data.billSeriesMode = nextMode;
      changes.billSeriesMode = { from: brand.billSeriesMode, to: nextMode };
    }
    const nextPrefix = nextMode === 'SHARED' ? nextPrefixRaw : null;
    if (nextPrefix !== brand.billSeriesPrefix) {
      data.billSeriesPrefix = nextPrefix;
      changes.billSeriesPrefix = { from: brand.billSeriesPrefix, to: nextPrefix };
    }
    if (Object.keys(data).length === 0) return brand;

    data.updatedBy = userId;
    const updated = await this.db.$transaction(async (tx) => {
      const b = await tx.brand.update({ where: { id: brand.id }, data });
      // Going back to per-outlet series: keep each outlet matching what it was using (the shared prefix).
      if (brand.billSeriesMode === 'SHARED' && nextMode === 'PER_OUTLET' && brand.billSeriesPrefix) {
        await tx.business.updateMany({
          where: { brandId: brand.id, deletedAt: null, billSeriesPrefix: null },
          data: { billSeriesPrefix: brand.billSeriesPrefix },
        });
      }
      if (data.name) {
        await tx.business.updateMany({ where: { brandId: brand.id }, data: { brandName: data.name } });
      }
      return b;
    });

    const seriesChanged = 'billSeriesMode' in changes || 'billSeriesPrefix' in changes;
    await this.recordEvent({
      tenantId: brand.tenantId,
      brandId: brand.id,
      actorId: userId,
      type: seriesChanged ? 'BILL_SERIES_CHANGED' : 'BRAND_UPDATED',
      summary: seriesChanged
        ? `Bill series for "${updated.name}" is now ${nextMode === 'SHARED' ? `shared (${nextPrefix})` : 'set per outlet'}`
        : `Brand renamed to "${updated.name}"`,
      metadata: changes,
    });
    this.audit.log({
      tenantId: brand.tenantId,
      userId,
      action: 'BRAND_UPDATED',
      resource: 'BRAND',
      resourceId: brand.id,
      metadata: changes,
    });
    if (data.name) {
      // tenant-scope-ok: brand outlets are the scope
      const outlets = await this.db.business.findMany({ where: { brandId: brand.id, deletedAt: null }, select: { id: true } });
      for (const o of outlets) await this.afterBusinessChange(o.id, brand.tenantId);
    }
    return updated;
  }

  // ── outlets ──────────────────────────────────────────────────────────────

  /**
   * Creates a new outlet as a full business listing in the brand owner's tenant. It starts
   * PENDING_VERIFICATION (it shows up in the normal admin approvals queue) and the owner then
   * finishes its profile and pays for its own plan, exactly like a first registration.
   */
  async addOutlet(userId: string, brandId: string, dto: AddOutletDto) {
    const brand = await this.ownedBrand(userId, brandId);
    if (brand.status !== 'ACTIVE') {
      throw new BadRequestException('This brand account is suspended, so new outlets cannot be added. Contact support.');
    }

    const hq = await this.db.business.findFirst({
      where: { brandId, isBrandHq: true, deletedAt: null },
      select: { categoryId: true, category: { select: { slug: true } } },
    });
    if (!hq) throw new BadRequestException('This brand has no head outlet yet.');

    let categoryId = hq.categoryId;
    if (dto.categorySlug && dto.categorySlug !== hq.category.slug) {
      const category = await this.db.category.findFirst({
        where: { tenantId: brand.tenantId, slug: dto.categorySlug, deletedAt: null },
        select: { id: true },
      });
      if (!category) throw new BadRequestException('That category is not available.');
      categoryId = category.id;
    }

    const label = dto.outletLabel.trim();
    const name = `${brand.name} - ${label}`.slice(0, 255);
    const email = dto.email.toLowerCase().trim();
    const phone = dto.phone.trim();

    // tenant-scope-ok: company names are unique platform-wide; selects id only
    const dupName = await this.db.business.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
    if (dupName) throw new ConflictException(`An outlet named "${name}" already exists. Use a different outlet name or area.`);

    // Contact details are unique per tenant, and the outlets share the brand's tenant, so each
    // outlet needs its own phone and email (they can't reuse the head outlet's).
    const dupContact = await this.db.business.findFirst({
      where: { tenantId: brand.tenantId, deletedAt: null, OR: [{ email }, { phone }] },
      select: { email: true },
    });
    if (dupContact) {
      throw new ConflictException(
        dupContact.email === email
          ? 'That email is already used by another of your outlets. Each outlet needs its own email.'
          : 'That phone number is already used by another of your outlets. Each outlet needs its own phone number.',
      );
    }

    const result = await this.db.$transaction(
      async (tx) => {
        const entity = await tx.entity.create({
          data: {
            tenantId: brand.tenantId,
            userId,
            type: 'BUSINESS',
            status: 'PENDING_VERIFICATION',
            name,
            email,
            phone,
          },
        });
        const business = await tx.business.create({
          data: {
            tenantId: brand.tenantId,
            ownerId: userId,
            categoryId,
            entityId: entity.id,
            name,
            slug: slugify(name),
            description: '',
            address: dto.address?.trim() ?? '',
            city: dto.city?.trim() ?? '',
            state: dto.state?.trim() ?? '',
            zipCode: dto.postalCode?.trim() ?? '',
            phone,
            email,
            status: 'PENDING_VERIFICATION',
            isVerified: false,
            profileType: 'OWNER',
            tags: [],
            socialLinks: {},
            brandId: brand.id,
            brandName: brand.name,
            outletLabel: label,
            isBrandHq: false,
            createdBy: userId,
          },
        });
        await tx.verificationRequest.create({
          data: { tenantId: brand.tenantId, entityId: entity.id, status: 'PENDING' },
        });
        await tx.businessStaff.create({
          data: { tenantId: brand.tenantId, businessId: business.id, userId, role: 'OWNER' },
        });
        const progress = await tx.onboardingProgress.create({
          data: {
            tenantId: brand.tenantId,
            entityType: 'BUSINESS',
            entityId: entity.id,
            currentStep: 1,
            status: 'PENDING_VERIFICATION',
            stepsCompleted: ['START'],
            metadata: { brandId: brand.id, outletLabel: label, profileType: 'OWNER' },
          },
        });
        await tx.onboardingEvent.create({
          data: {
            tenantId: brand.tenantId,
            entityType: 'BUSINESS',
            entityId: entity.id,
            event: 'BUSINESS_ONBOARDING_STARTED',
            metadata: { step: 1, brandId: brand.id },
          },
        });
        return { business, onboardingProgress: progress };
      },
      { maxWait: 30000, timeout: 60000 },
    );

    await this.recordEvent({
      tenantId: brand.tenantId,
      brandId: brand.id,
      businessId: result.business.id,
      actorId: userId,
      type: 'OUTLET_ADDED',
      summary: `New outlet "${name}" added to "${brand.name}" (awaiting approval)`,
      metadata: { outletLabel: label },
    });
    this.audit.log({
      tenantId: brand.tenantId,
      userId,
      action: 'BRAND_OUTLET_ADDED',
      resource: 'BUSINESS',
      resourceId: result.business.id,
      metadata: { brandId: brand.id },
    });
    await this.afterBusinessChange(result.business.id, brand.tenantId);
    return result;
  }

  async updateOutlet(userId: string, brandId: string, businessId: string, dto: UpdateOutletDto) {
    const brand = await this.ownedBrand(userId, brandId);
    const outlet = await this.db.business.findFirst({
      where: { id: businessId, brandId, deletedAt: null },
      select: { id: true, name: true, outletLabel: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    const label = dto.outletLabel.trim();
    const updated = await this.db.business.update({ where: { id: outlet.id }, data: { outletLabel: label, updatedBy: userId } });
    await this.recordEvent({
      tenantId: brand.tenantId,
      brandId,
      businessId,
      actorId: userId,
      type: 'OUTLET_UPDATED',
      summary: `Outlet "${outlet.name}" label changed to "${label}"`,
      metadata: { from: outlet.outletLabel, to: label },
    });
    await this.afterBusinessChange(outlet.id, brand.tenantId);
    return updated;
  }

  /** Removes a branch outlet. The head outlet cannot be removed in v1. */
  async removeOutlet(userId: string, brandId: string, businessId: string) {
    const brand = await this.ownedBrand(userId, brandId);
    const outlet = await this.db.business.findFirst({
      where: { id: businessId, brandId, deletedAt: null },
      select: { id: true, name: true, isBrandHq: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    if (outlet.isBrandHq) throw new BadRequestException('The head outlet cannot be removed.');

    await this.db.$transaction(async (tx) => {
      await tx.business.update({ where: { id: outlet.id }, data: { deletedAt: new Date(), status: 'ARCHIVED', updatedBy: userId } });
      // If it was the outlet the owner was operating, fall back to the default.
      await tx.user.updateMany({ where: { id: userId, activeBusinessId: outlet.id }, data: { activeBusinessId: null } });
    });
    await this.redis.del(`user:${userId}`);
    await this.recordEvent({
      tenantId: brand.tenantId,
      brandId,
      businessId,
      actorId: userId,
      type: 'OUTLET_REMOVED',
      summary: `Outlet "${outlet.name}" removed from "${brand.name}"`,
    });
    this.audit.log({
      tenantId: brand.tenantId,
      userId,
      action: 'BRAND_OUTLET_REMOVED',
      resource: 'BUSINESS',
      resourceId: outlet.id,
      metadata: { brandId },
    });
    await this.redis.del(`business:${outlet.id}`);
    try {
      await this.search.removeFromIndex(outlet.id, brand.tenantId);
    } catch {
      /* non-fatal */
    }
    return { ok: true };
  }

  // ── platform side ────────────────────────────────────────────────────────

  async adminList(params: { q?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 100);
    const where: any = { deletedAt: null };
    if (params.status && ['ACTIVE', 'SUSPENDED'].includes(params.status)) where.status = params.status;
    if (params.q?.trim()) where.name = { contains: params.q.trim(), mode: 'insensitive' };
    const [rows, total] = await Promise.all([
      // tenant-scope-ok: platform-wide brands oversight (super-admin)
      this.db.brand.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { businesses: true } },
          businesses: {
            where: { deletedAt: null },
            select: { id: true, status: true },
          },
          events: { orderBy: { createdAt: 'desc' }, take: 1, select: { type: true, summary: true, createdAt: true } },
        },
      }),
      // tenant-scope-ok: platform-wide brands oversight (super-admin)
      this.db.brand.count({ where }),
    ]);
    const data = rows.map(({ businesses, events, _count, ...b }) => ({
      ...b,
      outletCount: businesses.length,
      pendingOutlets: businesses.filter((x) => ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'DRAFT'].includes(x.status)).length,
      lastEvent: events[0] ?? null,
    }));
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async adminDetail(brandId: string) {
    // tenant-scope-ok: platform-wide brands oversight (super-admin)
    const brand = await this.db.brand.findFirst({
      where: { id: brandId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        businesses: {
          where: { deletedAt: null },
          orderBy: [{ isBrandHq: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true, name: true, slug: true, outletLabel: true, isBrandHq: true, status: true, city: true,
            billSeriesPrefix: true, launchOfferClaimedAt: true, createdAt: true,
            category: { select: { name: true } },
            subscriptions: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1, select: { packageName: true, status: true, endDate: true } },
          },
        },
        events: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    const { businesses, ...rest } = brand;
    return { brand: rest, outlets: businesses.map(({ subscriptions, ...o }) => ({ ...o, subscription: subscriptions[0] ?? null })) };
  }

  async adminEvents(params: { brandId?: string; type?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 100);
    const where: any = {};
    if (params.brandId) where.brandId = params.brandId;
    if (params.type) where.type = params.type;
    const [rows, total] = await Promise.all([
      // tenant-scope-ok: platform-wide brands oversight (super-admin)
      this.db.brandEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { brand: { select: { id: true, name: true } } },
      }),
      // tenant-scope-ok: platform-wide brands oversight (super-admin)
      this.db.brandEvent.count({ where }),
    ]);
    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async adminSetStatus(adminId: string, brandId: string, status: 'ACTIVE' | 'SUSPENDED') {
    // tenant-scope-ok: platform-wide brands oversight (super-admin)
    const brand = await this.db.brand.findFirst({ where: { id: brandId, deletedAt: null } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.status === status) return brand;
    const updated = await this.db.brand.update({ where: { id: brandId }, data: { status, updatedBy: adminId } });
    await this.recordEvent({
      tenantId: brand.tenantId,
      brandId,
      actorId: adminId,
      type: status === 'SUSPENDED' ? 'BRAND_SUSPENDED' : 'BRAND_REACTIVATED',
      summary: `Brand "${brand.name}" ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'} by the platform`,
    });
    this.audit.log({
      tenantId: brand.tenantId,
      userId: adminId,
      action: status === 'SUSPENDED' ? 'BRAND_SUSPENDED' : 'BRAND_REACTIVATED',
      resource: 'BRAND',
      resourceId: brandId,
    });
    return updated;
  }
}

