import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { generatePublicCode, normalizePublicCode } from '../../common/utils/public-code';
import { BusinessRepository } from '../../common/database/repositories/business.repository';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { SearchService } from '../search/search.service';
import { AuditService } from '../audit/audit.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { BusinessStatus } from '@saas/types';
import { operatingHoursForDb } from '../../common/utils/operating-hours.validator';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';
import { PaginatedResult } from '../../common/database/pagination';
import { toPublicBusiness } from '../../common/utils/public-business';
import { CryptoService } from '../../common/crypto/crypto.service';
import { encryptCompliance } from '../../common/crypto/compliance-fields';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly businessRepo: BusinessRepository,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly searchService: SearchService,
    private readonly auditService: AuditService,
    private readonly tenantResolver: TenantResolverService,
    private readonly crypto: CryptoService,
  ) {}

  async create(tenantId: string, ownerId: string, data: any) {
    const slug = this.generateSlug(data.name);
    const business = await this.businessRepo.create(tenantId, {
      ownerId,
      slug,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      email: data.email,
      website: data.website,
      operatingHours: data.operatingHours,
      status: BusinessStatus.PENDING_VERIFICATION,
    });

    await this.searchService.indexBusiness(business.id, tenantId);

    await this.auditService.log({
      tenantId,
      userId: ownerId,
      action: 'CREATE_BUSINESS',
      resource: 'BUSINESS',
      resourceId: business.id,
      newData: business,
    });

    return business;
  }

  async findAll(tenantId: string, params: any, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const { page, limit, categoryId, city, status, search } = params;

    // Fall back to Postgres full-text search abstraction
    if (search) {
      return this.searchService.searchBusinesses(
        tenantId,
        search,
        { categoryId, city },
        page,
        limit,
        isPublic,
      );
    }

    const criteria: any = {};
    if (categoryId) criteria.categoryId = categoryId;
    if (city) criteria.city = { contains: city, mode: 'insensitive' };
    if (status) criteria.status = status;

    const limitVal = limit || 20;
    const pageVal = page || 1;
    const skipVal = (pageVal - 1) * limitVal;

    const where = isPublic
      ? { ...criteria, status: 'APPROVED', deletedAt: null } // public listings never show unreviewed businesses
      : { ...criteria, tenantId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.businessRepo.model.findMany({
        where,
        skip: skipVal,
        take: limitVal,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.businessRepo.model.count({ where }),
    ]);

    const result = PaginatedResult.create(data, total, pageVal, limitVal);

    if (isPublic && result?.data) {
      result.data = result.data.map((biz: any) => toPublicBusiness(biz));
      // Additive: live-offer count + fulfilment modes for the public cards.
      result.data = await this.searchService.attachOfferSummary(
        result.data as Record<string, any>[],
      );
    }

    return result;
  }

  async findById(tenantId: string, id: string, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return this.findBySlug(tenantId, id, isPublic);
    }

    const cached = await this.redis.get(`business:${id}`);
    if (cached) {
      if (isPublic) {
        if ((cached as any).status !== 'APPROVED')
          throw new NotFoundException('Business not found');
        return toPublicBusiness(cached as any);
      }
      return cached;
    }

    const business = isPublic
      ? await this.businessRepo.model.findFirst({
          // Public profiles: approved listings only (pending/rejected/suspended stay private).
          where: { id, deletedAt: null, status: 'APPROVED' },
          include: {
            category: true,
            brand: { select: { id: true, name: true, slug: true, status: true } },
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        })
      : await this.businessRepo.findOne(tenantId, id, {
          include: {
            category: true,
            brand: { select: { id: true, name: true, slug: true, status: true } },
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        });

    if (!business) throw new NotFoundException('Business not found');

    await this.redis.set(`business:${id}`, business, 300);

    if (isPublic) return toPublicBusiness(business);
    return business;
  }

  /**
   * The business behind a QR code. Public: only an approved, live listing resolves, so a QR for a
   * pending, rejected or removed business shows the "not listed" page instead of a broken one.
   */
  async findIdByPublicCode(rawCode: string): Promise<{ id: string }> {
    const code = normalizePublicCode(rawCode);
    if (!code) throw new NotFoundException('Business not found');

    const key = `business-code:${code}`;
    const cached = await this.redis.get<string>(key);
    if (cached) return { id: cached };

    // tenant-scope-ok: a QR code is global; selects id only
    const business = await this.businessRepo.model.findFirst({
      where: { publicCode: code, deletedAt: null, status: 'APPROVED' },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    await this.redis.set(key, business.id, 300);
    return { id: business.id };
  }

  /**
   * A business's QR code, created the first time it is needed. The owner may ask for their own;
   * super and portal admins may ask for any business (to print a replacement).
   */
  async ensurePublicCode(
    tenantId: string,
    id: string,
    actor: { id: string; role?: string },
  ): Promise<{ publicCode: string }> {
    const isAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'MASTER_ADMIN';
    // tenant-scope-ok: platform admins work across tenants; the owner path below is tenant-scoped
    const business = isAdmin
      ? await this.businessRepo.model.findFirst({ where: { id, deletedAt: null } })
      : await this.businessRepo.findOne(tenantId, id);
    if (!business) throw new NotFoundException('Business not found');
    if (!isAdmin && business.ownerId !== actor.id) throw new ForbiddenException('Not authorized');
    if ((business as any).publicCode) return { publicCode: (business as any).publicCode };

    // 31^6 codes, so a clash is rare; retry on the unique index rather than checking first.
    for (let attempt = 0; attempt < 8; attempt++) {
      const publicCode = generatePublicCode();
      try {
        // Only fills an empty code, so two requests at once cannot replace a code already printed.
        const res = await this.businessRepo.model.updateMany({
          where: { id, publicCode: null },
          data: { publicCode },
        });
        if (res.count === 1) {
          await this.redis.del(`business:${id}`);
          return { publicCode };
        }
        const now = await this.businessRepo.model.findUnique({
          where: { id },
          select: { publicCode: true },
        });
        if (now?.publicCode) return { publicCode: now.publicCode };
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
      }
    }
    throw new Error('Could not assign a QR code. Please try again.');
  }

  async findBySlug(tenantId: string, slug: string, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const business = isPublic
      ? await this.businessRepo.model.findFirst({
          where: { slug, deletedAt: null, status: 'APPROVED' },
          include: {
            category: true,
            brand: { select: { id: true, name: true, slug: true, status: true } },
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        })
      : await this.businessRepo.findBySlug(tenantId, slug, {
          include: {
            category: true,
            brand: { select: { id: true, name: true, slug: true, status: true } },
            branches: { where: { isActive: true } },
            _count: { select: { reviews: true, products: true, offers: true } },
          },
        });
    if (!business) throw new NotFoundException('Business not found');

    if (isPublic) return toPublicBusiness(business);
    return business;
  }

  async update(tenantId: string, id: string, ownerId: string, data: any) {
    const business = await this.businessRepo.findOne(tenantId, id);
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== ownerId) throw new ForbiddenException('Not authorized');

    // Whitelist owner-editable fields. Never let an owner self-approve
    // (status / isVerified) or reassign ownership / tenant via this route.
    const ALLOWED = [
      'name',
      'description',
      'categoryId',
      'ownerName',
      'phone',
      'email',
      'website',
      'address',
      'city',
      'state',
      'zipCode',
      'district',
      'googleMapsUrl',
      'socialLinks',
      'tags',
      'logo',
      'halalStatus',
      'operatingHours',
      // Registration / KYC details
      'brandName',
      'companyName',
      'companyType',
      'compliance',
      'ownerContact',
      'billingContact',
      'supportContact',
      'branchHead',
      'categoryAttributes',
      'subcategoryIds',
      'billSeriesPrefix',
      // Hotel category pricing
      'hotelStarRating',
      'hotelAmenities',
      'amenityDetails',
    ];
    const payload: any = {};
    for (const k of ALLOWED) if (data[k] !== undefined) payload[k] = data[k];
    if (payload.compliance !== undefined)
      payload.compliance = encryptCompliance(payload.compliance, this.crypto);
    if (payload.operatingHours !== undefined)
      payload.operatingHours = operatingHoursForDb(payload.operatingHours);
    if (payload.billSeriesPrefix !== undefined)
      payload.billSeriesPrefix = String(payload.billSeriesPrefix).trim() || null;

    const updated = await this.businessRepo.update(tenantId, id, payload);

    await this.redis.del(`business:${id}`);

    await this.auditService.log({
      tenantId,
      userId: ownerId,
      action: 'UPDATE_BUSINESS',
      resource: 'BUSINESS',
      resourceId: id,
      oldData: business,
      newData: updated,
    });

    await this.searchService.indexBusiness(updated.id, tenantId);

    return updated;
  }

  async updateStatus(tenantId: string, id: string, status: BusinessStatus, adminId: string) {
    const updated = await this.businessRepo.updateStatus(tenantId, id, status);
    await this.redis.del(`business:${id}`);

    await this.auditService.log({
      tenantId,
      userId: adminId,
      action: 'UPDATE_BUSINESS_STATUS',
      resource: 'BUSINESS',
      resourceId: id,
      newData: { status },
    });

    await this.searchService.indexBusiness(updated.id, tenantId);

    return updated;
  }

  // Super-admin: list every business across all tenants (any status), with
  // filters, sortable columns, per-business published counts, and the total
  // billed amount each business has received.
  async adminFindAll(
    page = 1,
    limit = 25,
    opts: {
      search?: string;
      categoryId?: string;
      city?: string;
      status?: string;
      isVerified?: boolean;
      halalStatus?: string;
      brandId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const pageVal = Math.max(1, Number(page) || 1);
    const limitVal = Math.min(Number(limit) || 25, 100);
    const {
      search,
      categoryId,
      city,
      status,
      isVerified,
      halalStatus,
      brandId,
      sortBy,
      sortOrder,
    } = opts;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (status) where.status = status;
    if (typeof isVerified === 'boolean') where.isVerified = isVerified;
    if (halalStatus) where.halalStatus = halalStatus;
    if (brandId) where.brandId = brandId;

    const SORTABLE: Record<string, string> = {
      name: 'name',
      city: 'city',
      status: 'status',
      createdAt: 'createdAt',
      rating: 'averageRating',
    };
    const col = SORTABLE[sortBy || ''] || 'createdAt';
    const dir: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy = { [col]: dir };

    const [data, total] = await Promise.all([
      this.businessRepo.model.findMany({
        where,
        skip: (pageVal - 1) * limitVal,
        take: limitVal,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true } },
          _count: {
            select: {
              offers: { where: { deletedAt: null } },
              events: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.businessRepo.model.count({ where }),
    ]);

    // Total billed amount per business on this page (single grouped query).
    const ids = (data as any[]).map((b) => b.id);
    if (ids.length) {
      const sums = await this.db.bill.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, deletedAt: null },
        _sum: { amount: true },
      });
      const byId = new Map(sums.map((s: any) => [s.businessId, Number(s._sum.amount || 0)]));
      (data as any[]).forEach((b) => {
        b.totalBillAmount = byId.get(b.id) || 0;
      });
    }

    return {
      data,
      meta: {
        total,
        page: pageVal,
        limit: limitVal,
        totalPages: Math.ceil(total / limitVal),
        hasNext: pageVal * limitVal < total,
        hasPrev: pageVal > 1,
      },
    };
  }

  // Super-admin: edit any business's profile (cross-tenant, whitelisted fields).
  async adminUpdate(id: string, adminId: string, data: any) {
    const business = await this.businessRepo.model.findFirst({ where: { id, deletedAt: null } });
    if (!business) throw new NotFoundException('Business not found');

    const ALLOWED = [
      'name',
      'description',
      'categoryId',
      'ownerName',
      'phone',
      'email',
      'website',
      'address',
      'city',
      'state',
      'zipCode',
      'district',
      'googleMapsUrl',
      'socialLinks',
      'tags',
      'logo',
      'coverImage',
      'status',
      'isVerified',
      'halalStatus',
      'operatingHours',
      'billSeriesPrefix',
    ];
    const payload: any = {};
    for (const k of ALLOWED) if (data[k] !== undefined) payload[k] = data[k];
    if (payload.compliance !== undefined)
      payload.compliance = encryptCompliance(payload.compliance, this.crypto);
    if (payload.operatingHours !== undefined)
      payload.operatingHours = operatingHoursForDb(payload.operatingHours);
    if (payload.billSeriesPrefix !== undefined)
      payload.billSeriesPrefix = String(payload.billSeriesPrefix).trim() || null;

    const updated = await this.businessRepo.model.update({ where: { id }, data: payload });
    await this.redis.del(`business:${id}`);

    await this.auditService.log({
      tenantId: business.tenantId,
      userId: adminId,
      action: 'ADMIN_UPDATE_BUSINESS',
      resource: 'BUSINESS',
      resourceId: id,
      oldData: business,
      newData: updated,
    });

    try {
      await this.searchService.indexBusiness(id, business.tenantId);
    } catch {
      /* non-fatal */
    }

    return updated;
  }

  async adminSoftDelete(id: string, adminId: string) {
    const business = await this.businessRepo.model.findFirst({ where: { id, deletedAt: null } });
    if (!business) throw new NotFoundException('Business not found');

    const removed = await this.businessRepo.model.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: adminId },
    });
    await this.redis.del(`business:${id}`);

    await this.auditService.log({
      tenantId: business.tenantId,
      userId: adminId,
      action: 'ADMIN_DELETE_BUSINESS',
      resource: 'BUSINESS',
      resourceId: id,
      oldData: business,
    });

    try {
      await this.searchService.removeFromIndex(id, business.tenantId);
    } catch {
      /* non-fatal */
    }

    return removed;
  }

  /**
   * The owner's businesses with the one they're currently operating FIRST. Many dashboard pages do
   * `list[0]`, so putting the active outlet first (instead of changing every page) makes the whole
   * dashboard follow the outlet switcher. `activeBusinessId` is returned for the switcher itself.
   */
  async getOwnerBusinesses(tenantId: string, ownerId: string) {
    const [result, me] = await Promise.all([
      this.businessRepo.findMany(
        tenantId,
        { ownerId },
        { page: 1, limit: 100 },
        {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
                billSeriesMode: true,
                billSeriesPrefix: true,
                status: true,
              },
            },
          },
        },
      ),
      this.db.user.findUnique({ where: { id: ownerId }, select: { activeBusinessId: true } }),
    ]);
    const list: any[] = Array.isArray((result as any)?.data) ? (result as any).data : [];
    const wanted = me?.activeBusinessId;
    const idx = wanted ? list.findIndex((b) => b.id === wanted) : -1;
    if (idx > 0) {
      const [active] = list.splice(idx, 1);
      list.unshift(active);
    }
    return { ...(result as any), activeBusinessId: list[0]?.id ?? null };
  }

  async getNearby(tenantId: string, lat: number, lng: number, radiusKm = 10, isPublic = false) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    lat = Number(lat);
    lng = Number(lng);
    radiusKm = Number(radiusKm) || 10;
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const where: any = isPublic
      ? {
          latitude: { gte: lat - latDelta, lte: lat + latDelta },
          longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
          status: 'APPROVED',
          deletedAt: null,
        }
      : {
          tenantId,
          latitude: { gte: lat - latDelta, lte: lat + latDelta },
          longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
          deletedAt: null,
        };

    const rows = await this.businessRepo.model.findMany({
      where,
      take: 200,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });

    // Additive: distance from the caller (km, 1 dp) and nearest-first order, so
    // the cap keeps the closest listings instead of an arbitrary slice.
    const toRad = (d: number) => (d * Math.PI) / 180;
    const data = (rows as any[])
      .map((biz: any) => {
        const bLat = Number(biz.latitude);
        const bLng = Number(biz.longitude);
        const a =
          Math.sin(toRad(bLat - lat) / 2) ** 2 +
          Math.cos(toRad(lat)) * Math.cos(toRad(bLat)) * Math.sin(toRad(bLng - lng) / 2) ** 2;
        const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...biz, distanceKm: Number.isFinite(km) ? Math.round(km * 10) / 10 : null };
      })
      .sort((x: any, y: any) => (x.distanceKm ?? Infinity) - (y.distanceKm ?? Infinity))
      .slice(0, 100);

    if (isPublic && data) {
      const stripped = data.map((biz: any) => toPublicBusiness(biz));
      return this.searchService.attachOfferSummary(stripped);
    }
    return data;
  }

  // ── Business Tags ─────────────────────────────────────────

  async getTags(tenantId: string, businessId: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const tags = await (this.db as any).businessTag.findMany({
      where: { tenantId, businessId },
      select: { tag: true },
      orderBy: { tag: 'asc' },
    });
    return tags.map((t: any) => t.tag);
  }

  async setTags(tenantId: string, businessId: string, ownerId: string, tags: string[]) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const business = await this.businessRepo.findOne(tenantId, businessId);
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== ownerId) throw new ForbiddenException('Not authorized');

    const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];

    // Delete all existing tags then re-insert
    await (this.db as any).businessTag.deleteMany({ where: { tenantId, businessId } });
    if (normalized.length > 0) {
      await (this.db as any).businessTag.createMany({
        data: normalized.map((tag) => ({ tenantId, businessId, tag })),
        skipDuplicates: true,
      });
    }

    await this.redis.del(`business:${businessId}`);
    return normalized;
  }

  async searchByTag(tenantId: string, tag: string, page = 1, limit = 20) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const normalized = tag.trim().toLowerCase();

    const [rows, total] = await Promise.all([
      (this.db as any).businessTag.findMany({
        where: {
          tenantId,
          tag: { contains: normalized },
          business: { status: 'APPROVED', deletedAt: null },
        },
        include: {
          business: {
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.db as any).businessTag.count({
        where: {
          tenantId,
          tag: { contains: normalized },
          business: { status: 'APPROVED', deletedAt: null },
        },
      }),
    ]);

    const data = rows.map((r: any) => {
      const biz = { ...r.business };
      delete biz.ownerName;
      delete biz.ownerId;
      return biz;
    });

    return PaginatedResult.create(data, total, page, limit);
  }

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
}
